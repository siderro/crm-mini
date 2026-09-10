// Ziskovost projektů — skutečná čísla uzavřených projektů.
//
// Schválně jen uzavřené. U běžícího projektu zbývá práce, která zisk sníží,
// takže „průběžná ziskovost" by lhala — v Projektech je proto jen spotřeba
// ceny. Tady jsou čísla, která už se nezmění: uzavření je zmrazilo.
//
// Řadí se podle marže, takže nejlepší je nahoře a nejhorší dole. Prodělečné
// řádky jsou červeně a pro bono s interními jdou na konec — nemají výnos,
// nemá smysl je poměřovat maržíí.

import { esc, formatDate, formatMoney } from '../../util.js';
import { getProjects, BILLING_LABEL } from '../projects/store.js';
import { statsForProjects } from '../projects/economics.js';

export const profit = {
  id: 'profit',
  label: 'Ziskovost projektů',
  desc: 'Jak dopadly uzavřené projekty',
  superadminOnly: true,    // peníze se nerozdávají
  render(mount) {
    mount.innerHTML = `
      <div class="prof">
        <div class="page-head"><h1>Ziskovost projektů</h1></div>
        <p class="muted prof-lead">
          Jen uzavřené projekty — čísla zmrazená při uzavření, pozdější změna sazeb je nepřepíše.
        </p>
        <div class="prof-filters">
          ${RANGES.map((r) =>
            `<button class="btn prof-filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
          ).join('')}
        </div>
        <div id="prof-body"><div class="loading">Načítám…</div></div>
      </div>`;

    mount.querySelector('.prof-filters').addEventListener('click', (e) => {
      const range = e.target.dataset.range;
      if (!range) return;
      mount.querySelectorAll('.prof-filter').forEach((b) => b.classList.toggle('active', b === e.target));
      load(mount.querySelector('#prof-body'), range);
    });

    load(mount.querySelector('#prof-body'), DEFAULT_RANGE);
  },
};

const RANGES = [
  { id: 'year', label: 'Tento rok' },
  { id: 'lastyear', label: 'Loňský rok' },
  { id: 'all', label: 'Vše' },
];

const DEFAULT_RANGE = 'year';

/** Hranice [od, do) jako 'YYYY-MM-DD'; null = neomezeno. */
function rangeBounds(id) {
  const year = new Date().getFullYear();
  if (id === 'year') return [`${year}-01-01`, null];
  if (id === 'lastyear') return [`${year - 1}-01-01`, `${year}-01-01`];
  return [null, null];
}

function inRange(value, [from, to]) {
  const day = String(value || '').slice(0, 10);
  return (from === null || day >= from) && (to === null || day < to);
}

function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

const czk = (v) => formatMoney(Math.round(v || 0));

/** Odhad hodin proti skutečnosti — kde se to utrhlo, je vidět hned. */
function hoursCell(stats) {
  const actual = stats.total.hours;
  const est = stats.design.estHours;

  if (!est) return `<span class="muted">${esc(fmtHours(actual))} h</span>`;

  const over = actual > est;
  return `<span class="${over ? 'tone-over' : ''}">${esc(fmtHours(est))} → ${esc(fmtHours(actual))} h</span>`;
}

async function load(body, rangeId) {
  let projects, stats;
  try {
    const all = await getProjects({ onlyClosed: true });
    projects = all.filter((p) => inRange(p.closed_at, rangeBounds(rangeId)));
    stats = await statsForProjects(projects);
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!projects.length) {
    body.innerHTML = `<div class="empty-state">V tomhle období nic uzavřeného.</div>`;
    return;
  }

  const rows = projects
    .map((p) => ({ project: p, stats: stats.get(p.id) }))
    // Nejlepší nahoře, nejhorší dole; bez výnosu na konec.
    .sort((a, b) => {
      const am = a.stats.margin?.percent;
      const bm = b.stats.margin?.percent;
      if (am == null && bm == null) return 0;
      if (am == null) return 1;
      if (bm == null) return -1;
      return bm - am;
    });

  let sumRevenue = 0;
  let sumCost = 0;
  for (const { stats: s } of rows) {
    sumCost += s.margin ? s.margin.cost : s.total.cost;
    if (s.margin) sumRevenue += s.margin.revenue;
  }
  const profitTotal = sumRevenue - sumCost;
  const marginTotal = sumRevenue ? (profitTotal / sumRevenue) * 100 : null;

  const cell = (label, value, tone = '') =>
    `<div class="pm-cell"><span class="pm-cell-label">${label}</span><span class="pm-cell-value ${tone}">${value}</span></div>`;

  body.innerHTML = `
    <div class="pm-summary prof-sum">
      ${cell('Výnos', esc(czk(sumRevenue)))}
      ${cell('Náklad', esc(czk(sumCost)))}
      ${cell('Zisk', `<strong>${esc(czk(profitTotal))}</strong>`, profitTotal < 0 ? 'tone-over' : '')}
      ${cell('Marže', marginTotal == null ? '—' : `${esc(Math.round(marginTotal))} %`,
        marginTotal != null && marginTotal < 0 ? 'tone-over' : '')}
      ${cell('Projektů', rows.length)}
    </div>
    <table class="table prof-table">
      <thead>
        <tr>
          <th>Projekt</th><th>Uzavřeno</th>
          <th class="prof-num">Výnos</th><th class="prof-num">Náklad</th>
          <th class="prof-num">Zisk</th><th class="prof-num">Marže</th>
          <th class="prof-num">Hodiny odhad → skutečnost</th>
        </tr>
      </thead>
      <tbody>${rows.map(row).join('')}</tbody>
    </table>`;

  body.querySelector('tbody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) location.hash = `#/pm/${tr.dataset.id}`;
  });
}

function row({ project: p, stats: s }) {
  const m = s.margin;
  const loss = m && m.profit < 0 ? ' tone-over' : '';

  const money = m
    ? `<td class="prof-num">${esc(formatMoney(m.revenue))}</td>
       <td class="prof-num">${esc(czk(m.cost))}</td>
       <td class="prof-num${loss}">${esc(czk(m.profit))}</td>
       <td class="prof-num${loss}">${m.percent == null ? '—' : esc(Math.round(m.percent)) + ' %'}</td>`
    : `<td class="prof-num"><span class="status status-frozen">${esc(BILLING_LABEL[p.billing])}</span></td>
       <td class="prof-num">${esc(czk(s.total.cost))}</td>
       <td class="prof-num" colspan="2"><span class="muted">bez výnosu</span></td>`;

  return `
    <tr data-id="${esc(p.id)}">
      <td class="prof-name">${esc(p.name)}</td>
      <td class="prof-date">${esc(formatDate(p.closed_at))}</td>
      ${money}
      <td class="prof-num">${hoursCell(s)}</td>
    </tr>`;
}
