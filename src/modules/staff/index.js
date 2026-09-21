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

import { esc, guard, formatMoneyShort } from '../../util.js';
import { listUsers } from '../access/store.js';
import { rateResolver } from '../rates/store.js';
import { getEntries } from '../timesheet/store.js';
import { getProjects } from '../projects/store.js';
import {
  RANGES, DEFAULT_RANGE, VIEWS, DEFAULT_VIEW, MONTH_NAMES,
  czk, fmtHours, rangeBounds, inRange, soldRates, blank, add, finish, priceEntry,
} from './logic.js';

export const staff = {
  id: 'staff',
  label: 'Ziskovost lidí',
  desc: 'Kdo kolik vydělal a kolik stál',
  superadminOnly: true,
  tileInfo,    // mzdové údaje se nerozdávají
  render(mount) {
    mount.innerHTML = `
      <div class="stf">
        <div class="page-head"><h1>Ziskovost lidí</h1></div>
        <p class="lead">
          Prodaná hodina proti nákladu. Prodejní cena hodiny = cena projektu ÷ odhad hodin,
          u PM částka na PM ÷ odpracované PM hodiny. Přeteklý projekt tedy sráží přínos.
        </p>
        <div class="stf-controls">
          <div class="filter-bar">
            ${RANGES.map((r) =>
              `<button class="btn filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
            ).join('')}
          </div>
          <div class="filter-bar">
            ${VIEWS.map((v) =>
              `<button class="btn filter${v.id === DEFAULT_VIEW ? ' active' : ''}" data-view="${v.id}">${v.label}</button>`
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
        mount.querySelectorAll('.filter').forEach((b) => b.classList.toggle('active', b === e.target));
      } else {
        view = v;
        mount.querySelectorAll('.filter').forEach((b) => b.classList.toggle('active', b === e.target));
      }
      guard(body, () => load(body, range, view));
    });

    guard(body, () => load(body, range, view));
  },
};

// ── Výpočet ──

/**
 * Za kolik se na projektu prodává hodina. Vrací zvlášť sazbu pro design
 * a pro PM; null znamená „nevíme" (chybí odhad) a takové hodiny se do
 * prodaného nezapočítají — radši mezera než vymyšlené číslo.
 */

/** Přínos = prodáno − náklad. Marže se počítá jen z toho, co se prodávalo. */

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

/** Dlaždice na hubu: přínos lidí za tenhle rok. */
async function tileInfo() {
  const data = await collect('year');
  if (!data.entries.length) return null;

  const total = blank();
  for (const e of data.entries) {
    const { rate, sold, billable } = priceEntry(e, data.byId, data.rates, data.rateOn);
    add(total, e, rate, sold, billable);
  }

  const { profit, margin } = finish(total);
  return {
    badge: formatMoneyShort(profit),
    alert: margin != null && margin < 0
      ? { text: 'prodaná hodina je pod nákladem', tone: 'over' }
      : null,
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
    `<div class="summary-cell"><span class="summary-label">${label}</span><span class="summary-value ${tone}">${value}</span></div>`;

  return `
    <div class="summary">
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
    ? `<p class="note">${out.map(esc).join('<br>')}</p>`
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
    <div class="table-scroll"><table class="table stf-table">
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
    </table></div>
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
    <div class="table-scroll"><table class="table stf-table">
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
    </table></div>
    ${notes(total)}`;
}
