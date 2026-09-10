// Ziskovost lidí — kolik kdo vydělal proti tomu, kolik stál.
//
// Metoda: každá vykázaná hodina má cenu, za kterou jsme ji prodali, a náklad.
//   design — prodáno za cenu projektu ÷ odhad hodin
//   PM     — prodáno za částku na PM ÷ hodiny PM, které na projektu opravdu jsou
//   náklad — hodiny × sazba platná k datu výkazu
//
// Z toho plyne, co je na tom podstatné: když se na projektu přeteče, klesá
// prodejní hodnota hodiny, a přínos člověka spadne — i když má pořád stejnou
// sazbu. To je přesně ta páka, kterou chceš vidět.
//
// Pro bono a interní projekty nic neprodávají. Jejich hodiny se počítají jako
// náklad s nulovým výnosem a jsou vidět zvlášť, aby nekazily marži klientské
// práce, ale ani se neztratily.

import { esc, formatMoney } from '../../util.js';
import { listUsers } from '../access/store.js';
import { rateResolver } from '../rates/store.js';
import { getEntries } from '../timesheet/store.js';
import { getProjects, isBillable } from '../projects/store.js';

export const staff = {
  id: 'staff',
  label: 'Ziskovost lidí',
  desc: 'Kdo kolik vydělal a kolik stál',
  superadminOnly: true,    // mzdové údaje se nerozdávají
  render(mount) {
    mount.innerHTML = `
      <div class="stf">
        <div class="page-head"><h1>Ziskovost lidí</h1></div>
        <p class="muted stf-lead">
          Prodaná hodina proti nákladu. Prodejní cena hodiny = cena projektu ÷ odhad hodin,
          u PM částka na PM ÷ odpracované PM hodiny. Přeteklý projekt tedy sráží přínos.
        </p>
        <div class="stf-controls">
          <div class="stf-filters">
            ${RANGES.map((r) =>
              `<button class="btn stf-filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
            ).join('')}
          </div>
          <div class="stf-filters">
            ${VIEWS.map((v) =>
              `<button class="btn stf-view${v.id === DEFAULT_VIEW ? ' active' : ''}" data-view="${v.id}">${v.label}</button>`
            ).join('')}
          </div>
        </div>
        <div id="stf-body"><div class="loading">Načítám…</div></div>
      </div>`;

    let range = DEFAULT_RANGE;
    let view = DEFAULT_VIEW;
    const body = mount.querySelector('#stf-body');

    mount.querySelector('.stf-controls').addEventListener('click', (e) => {
      const r = e.target.dataset.range;
      const v = e.target.dataset.view;
      if (!r && !v) return;

      if (r) {
        range = r;
        mount.querySelectorAll('.stf-filter').forEach((b) => b.classList.toggle('active', b === e.target));
      } else {
        view = v;
        mount.querySelectorAll('.stf-view').forEach((b) => b.classList.toggle('active', b === e.target));
      }
      load(body, range, view);
    });

    load(body, range, view);
  },
};

const RANGES = [
  { id: 'month', label: 'Tento měsíc' },
  { id: 'lastmonth', label: 'Minulý měsíc' },
  { id: 'year', label: 'Tento rok' },
  { id: 'lastyear', label: 'Loňský rok' },
  { id: 'all', label: 'Vše' },
];

const VIEWS = [
  { id: 'people', label: 'Podle lidí' },
  { id: 'time', label: 'V čase' },
];

const DEFAULT_RANGE = 'year';
const DEFAULT_VIEW = 'people';

const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

const czk = (v) => formatMoney(Math.round(v || 0));

function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

function iso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Hranice [od, do] jako 'YYYY-MM-DD', obě včetně; null = neomezeno. */
function rangeBounds(id) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = (yy, mm) => new Date(yy, mm + 1, 0).getDate();

  switch (id) {
    case 'month': return [iso(y, m, 1), iso(y, m, lastDay(y, m))];
    case 'lastmonth': {
      const [py, pm] = m === 0 ? [y - 1, 11] : [y, m - 1];
      return [iso(py, pm, 1), iso(py, pm, lastDay(py, pm))];
    }
    case 'year': return [iso(y, 0, 1), iso(y, 11, 31)];
    case 'lastyear': return [iso(y - 1, 0, 1), iso(y - 1, 11, 31)];
    default: return [null, null];
  }
}

function inRange(date, [from, to]) {
  return (from === null || date >= from) && (to === null || date <= to);
}

// ── Výpočet ──

/**
 * Za kolik se na projektu prodává hodina. Vrací zvlášť sazbu pro design
 * a pro PM; null znamená „nevíme" (chybí odhad) a takové hodiny se do
 * prodaného nezapočítají — radši mezera než vymyšlené číslo.
 */
function soldRates(project, pmHours) {
  if (!isBillable(project)) return { design: 0, pm: 0, unknown: false };

  const price = project.final_price != null ? Number(project.final_price) : Number(project.est_price);
  const estHours = Number(project.est_hours);
  const pmBudget = Number(project.est_pm);

  return {
    design: price && estHours ? price / estHours : null,
    // PM se dělí skutečně odpracovanými hodinami — rozpočet je fixní, takže
    // čím víc se na něm dělá, tím míň každá hodina vydělá.
    pm: pmBudget && pmHours ? pmBudget / pmHours : null,
    unknown: !(price && estHours),
  };
}

function blank() {
  return { hours: 0, cost: 0, sold: 0, unknownHours: 0, internalHours: 0, internalCost: 0 };
}

function add(acc, e, rate, sold, billable) {
  acc.hours += e.hours;
  acc.cost += rate == null ? 0 : rate * e.hours;

  if (!billable) {
    acc.internalHours += e.hours;
    acc.internalCost += rate == null ? 0 : rate * e.hours;
    return;
  }
  if (sold == null) acc.unknownHours += e.hours;
  else acc.sold += sold * e.hours;
}

/** Přínos = prodáno − náklad. Marže se počítá jen z toho, co se prodávalo. */
function finish(acc) {
  const billableCost = acc.cost - acc.internalCost;
  return {
    ...acc,
    profit: acc.sold - billableCost,
    margin: acc.sold ? ((acc.sold - billableCost) / acc.sold) * 100 : null,
  };
}

async function collect(rangeId) {
  const [users, allEntries, projects] = await Promise.all([
    listUsers(), getEntries(), getProjects({ includeClosed: true }),
  ]);

  const entries = allEntries.filter((e) => inRange(e.date, rangeBounds(rangeId)));
  const rateOn = await rateResolver();

  // PM hodiny se počítají z celého projektu, ne jen z vybraného období —
  // rozpočet na PM je taky za celý projekt.
  const pmHours = {};
  for (const e of allEntries) {
    if (e.kind === 'pm') pmHours[e.project_id] = (pmHours[e.project_id] || 0) + e.hours;
  }

  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const rates = Object.fromEntries(
    projects.map((p) => [p.id, soldRates(p, pmHours[p.id] || 0)])
  );

  return { users, entries, byId, rates, rateOn };
}

/** Rozpad jednoho výkazu na náklad a prodanou hodnotu. */
function priceEntry(e, byId, rates, rateOn) {
  const project = byId[e.project_id];
  const r = rates[e.project_id] || { design: null, pm: null };
  return {
    rate: rateOn(e.email, e.date),
    sold: e.kind === 'pm' ? r.pm : r.design,
    billable: project ? isBillable(project) : true,
    project,
  };
}

// ── Pohledy ──

async function load(body, rangeId, view) {
  let data;
  try {
    data = await collect(rangeId);
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!data.entries.length) {
    body.innerHTML = `<div class="empty-state">V tomhle období nikdo nic nevykázal.</div>`;
    return;
  }

  if (view === 'time') renderTime(body, data);
  else renderPeople(body, data);
}

function summary(total) {
  const cell = (label, value, tone = '') =>
    `<div class="pm-cell"><span class="pm-cell-label">${label}</span><span class="pm-cell-value ${tone}">${value}</span></div>`;

  return `
    <div class="pm-summary stf-sum">
      ${cell('Odpracováno', `${esc(fmtHours(total.hours))} h`)}
      ${cell('Prodáno', esc(czk(total.sold)))}
      ${cell('Náklad', esc(czk(total.cost)))}
      ${cell('Přínos', `<strong>${esc(czk(total.profit))}</strong>`, total.profit < 0 ? 'tone-over' : '')}
      ${cell('Marže', total.margin == null ? '—' : `${esc(Math.round(total.margin))} %`,
        total.margin != null && total.margin < 0 ? 'tone-over' : '')}
    </div>`;
}

/** Poznámka pod tabulkou — hodiny, které se nedaly ocenit, se nemají ztratit. */
function notes(total) {
  const out = [];
  if (total.unknownHours) {
    out.push(`${fmtHours(total.unknownHours)} h na projektech bez odhadu ceny nebo hodin
      se do prodaného nepočítá — chybí z čeho.`);
  }
  if (total.internalHours) {
    out.push(`${fmtHours(total.internalHours)} h šlo na pro bono a interní projekty
      za ${czk(total.internalCost)}. Nic neprodávají, do marže nevstupují.`);
  }
  return out.length
    ? `<p class="muted stf-note">${out.map(esc).join('<br>')}</p>`
    : '';
}

function renderPeople(body, { users, entries, byId, rates, rateOn }) {
  const per = {};
  const total = blank();

  for (const e of entries) {
    const { rate, sold, billable } = priceEntry(e, byId, rates, rateOn);
    (per[e.email] ||= blank());
    add(per[e.email], e, rate, sold, billable);
    add(total, e, rate, sold, billable);
  }

  const known = new Set(users.map((u) => u.email));
  const rows = Object.entries(per)
    .map(([email, acc]) => ({ email, ...finish(acc) }))
    .sort((a, b) => b.profit - a.profit);

  body.innerHTML = `
    ${summary(finish(total))}
    <table class="table stf-table">
      <thead>
        <tr>
          <th>Člověk</th><th class="stf-num">Hodin</th>
          <th class="stf-num">Prodáno</th><th class="stf-num">Náklad</th>
          <th class="stf-num">Přínos</th><th class="stf-num">Marže</th>
          <th class="stf-num">Prodáno / h</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td class="stf-name">${esc(r.email)}${known.has(r.email) ? '' : ' <span class="muted">(už není v systému)</span>'}</td>
            <td class="stf-num">${esc(fmtHours(r.hours))} h</td>
            <td class="stf-num">${esc(czk(r.sold))}</td>
            <td class="stf-num">${esc(czk(r.cost))}</td>
            <td class="stf-num${r.profit < 0 ? ' tone-over' : ''}">${esc(czk(r.profit))}</td>
            <td class="stf-num${r.margin != null && r.margin < 0 ? ' tone-over' : ''}">${
              r.margin == null ? '—' : esc(Math.round(r.margin)) + ' %'}</td>
            <td class="stf-num">${r.hours ? esc(czk(r.sold / r.hours)) + '/h' : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    ${notes(total)}`;
}

function renderTime(body, { entries, byId, rates, rateOn }) {
  const per = {};
  const total = blank();

  for (const e of entries) {
    const key = e.date.slice(0, 7);          // 'YYYY-MM'
    const { rate, sold, billable } = priceEntry(e, byId, rates, rateOn);
    (per[key] ||= blank());
    add(per[key], e, rate, sold, billable);
    add(total, e, rate, sold, billable);
  }

  const rows = Object.entries(per)
    .map(([key, acc]) => ({ key, ...finish(acc) }))
    .sort((a, b) => b.key.localeCompare(a.key));

  const monthLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  };

  body.innerHTML = `
    ${summary(finish(total))}
    <table class="table stf-table">
      <thead>
        <tr>
          <th>Měsíc</th><th class="stf-num">Hodin</th>
          <th class="stf-num">Prodáno</th><th class="stf-num">Náklad</th>
          <th class="stf-num">Přínos</th><th class="stf-num">Marže</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td class="stf-name">${esc(monthLabel(r.key))}</td>
            <td class="stf-num">${esc(fmtHours(r.hours))} h</td>
            <td class="stf-num">${esc(czk(r.sold))}</td>
            <td class="stf-num">${esc(czk(r.cost))}</td>
            <td class="stf-num${r.profit < 0 ? ' tone-over' : ''}">${esc(czk(r.profit))}</td>
            <td class="stf-num${r.margin != null && r.margin < 0 ? ' tone-over' : ''}">${
              r.margin == null ? '—' : esc(Math.round(r.margin)) + ' %'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    ${notes(total)}`;
}
