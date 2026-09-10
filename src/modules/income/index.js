// Příjmy výhled — kdy a kolik má přijít.
//
// Jen plán, ne historie: co se fakturovalo a co je zaplacené, tady není.
//
// Odhad je jednoduchý: projekt se vyfakturuje po svém odhadovaném konci,
// s odstupem na vystavení faktury. Částka je cena projektu i s project
// managementem — to je to, co jde klientovi na faktuře.
//
// SLA je zvlášť: účtuje se za každý kalendářní měsíc, ve kterém projekt běží,
// takže padá do měsíců průběžně, ne na konec. V kartě je pod čárou.
//
// Nezobrazují se uzavřené projekty — ty už jsou za námi.

import { esc, formatDate, formatMoney, formatMoneyShort } from '../../util.js';
import { getProjects, isBillable, BILLING_LABEL } from '../projects/store.js';

/** Kolik dní po konci projektu se počítá s vystavením faktury. */
const INVOICE_LAG_DAYS = 20;

const RANGES = [
  { id: 'next12', label: 'Příštích 12 měsíců' },
  { id: 'year', label: 'Tento rok' },
  { id: 'nextyear', label: 'Příští rok' },
];

const DEFAULT_RANGE = 'next12';

export const income = {
  id: 'income',
  label: 'Příjmy výhled',
  desc: 'Co má přijít v následujících měsících',
  superadminOnly: true,    // peníze se nerozdávají, stejně jako Výplaty
  tileInfo,                // na hubu: co má přijít tenhle měsíc
  render(mount) {
    mount.innerHTML = `
      <div class="inc">
        <div class="page-head"><h1>Příjmy výhled</h1></div>
        <p class="muted inc-lead">
          Odhad fakturace: konec projektu + ${INVOICE_LAG_DAYS} dní, cena projektu včetně
          project managementu. SLA se účtuje zvlášť za každý měsíc, ve kterém projekt běží.
        </p>
        <div class="inc-filters">
          ${RANGES.map((r) =>
            `<button class="btn inc-filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
          ).join('')}
        </div>
        <div id="inc-body"><div class="loading">Načítám…</div></div>
      </div>`;

    mount.querySelector('.inc-filters').addEventListener('click', (e) => {
      const range = e.target.dataset.range;
      if (!range) return;
      mount.querySelectorAll('.inc-filter').forEach((b) => b.classList.toggle('active', b === e.target));
      load(mount.querySelector('#inc-body'), range);
    });

    load(mount.querySelector('#inc-body'), DEFAULT_RANGE);
  },
};

/**
 * Měsíce, které výhled ukazuje. Je to plán, takže se nikdy nekouká zpátky —
 * „tento rok" znamená zbytek roku, ne od ledna. Co mělo být vyfakturované
 * dřív a není, spadne do bloku „po termínu".
 */
function monthsFor(rangeId, today) {
  const y = today.getFullYear();
  const m = today.getMonth();

  const build = (year, from, count) =>
    Array.from({ length: count }, (_, i) => new Date(year, from + i, 1));

  switch (rangeId) {
    case 'year': return build(y, m, 12 - m);
    case 'nextyear': return build(y + 1, 0, 12);
    default: return build(y, m, 12);
  }
}

function rangeTotalLabel(rangeId) {
  return RANGES.find((r) => r.id === rangeId)?.label || '';
}

/** Dlaždice na hubu: co má přijít tenhle měsíc a co se mělo dávno fakturovat. */
async function tileInfo() {
  const projects = await getProjects();
  if (!projects.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);

  let due = 0;
  let overdue = 0;

  for (const p of projects) {
    const end = parseDay(p.est_end);
    if (!end || !isBillable(p)) continue;

    const date = addDays(end, INVOICE_LAG_DAYS);
    if (date < today) overdue += 1;
    else if (monthKey(date) === monthKey(month)) due += invoiceAmount(p);
  }

  const total = due + slaForMonth(projects, month).amount;
  if (!total && !overdue) return null;

  return {
    badge: total ? formatMoneyShort(total) : null,
    alert: overdue
      ? { text: `${overdue} po termínu fakturace`, tone: 'over' }
      : null,
  };
}

const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

/** 'YYYY-MM-DD' → půlnoc lokálně. Null pro prázdné i nesmyslné datum. */
function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/** Běží projekt v tomhle kalendářním měsíci? Rozhoduje překryv s termíny. */
function runsInMonth(project, month) {
  const start = parseDay(project.est_start);
  const end = parseDay(project.est_end);
  if (!start || !end) return false;   // bez termínů se plánovat nedá

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return start <= monthEnd && end >= monthStart;
}

/** SLA za jeden měsíc: kolik projektů ho účtuje a za kolik dohromady. */
function slaForMonth(projects, month) {
  const active = projects.filter((p) => isBillable(p) && p.est_sla && runsInMonth(p, month));
  return {
    count: active.length,
    amount: active.reduce((sum, p) => sum + (Number(p.est_sla) || 0), 0),
  };
}

/** Kolik se za projekt vyfakturuje. Pro bono a interní nic. */
function invoiceAmount(p) {
  if (!isBillable(p)) return 0;
  return (Number(p.est_price) || 0) + (Number(p.est_pm) || 0);
}

async function load(body, rangeId) {
  let projects;
  try {
    projects = await getProjects();   // jen běžící; uzavřené jsou za námi
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const planned = [];    // má se fakturovat v horizontu
  const overdue = [];    // datum už uteklo a projekt pořád běží
  const undated = [];    // bez odhadu konce se plánovat nedá
  const unbilled = [];   // pro bono a interní

  for (const p of projects) {
    if (!isBillable(p)) { unbilled.push(p); continue; }

    const end = parseDay(p.est_end);
    if (!end) { undated.push(p); continue; }

    const item = { project: p, date: addDays(end, INVOICE_LAG_DAYS), amount: invoiceAmount(p) };
    (item.date < today ? overdue : planned).push(item);
  }

  // I prázdné měsíce se vypisují — ať je vidět díra.
  const months = monthsFor(rangeId, today).map((d) => ({
    date: d, key: monthKey(d), items: [], sla: slaForMonth(projects, d),
  }));
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));

  let beyond = 0;
  for (const item of planned) {
    const bucket = byKey[monthKey(item.date)];
    if (bucket) bucket.items.push(item);
    else beyond += item.amount;   // spadá mimo vybrané období
  }
  for (const m of months) m.items.sort((a, b) => a.date - b.date);

  const horizonTotal = months.reduce(
    (s, m) => s + m.items.reduce((x, i) => x + i.amount, 0) + m.sla.amount, 0);
  const slaTotal = months.reduce((s, m) => s + m.sla.amount, 0);
  const overdueTotal = overdue.reduce((s, i) => s + i.amount, 0);

  body.innerHTML = `
    <div class="pm-summary inc-sum">
      ${cell(rangeTotalLabel(rangeId), `<strong>${esc(formatMoney(horizonTotal))}</strong>`)}
      ${overdue.length ? cell('Po termínu', esc(formatMoney(overdueTotal)), 'tone-over') : ''}
      ${slaTotal ? cell('Z toho SLA', esc(formatMoney(slaTotal))) : ''}
      ${beyond ? cell('Mimo období', esc(formatMoney(beyond))) : ''}
      ${cell('Projektů v období', months.reduce((s, m) => s + m.items.length, 0))}
    </div>
    ${overdue.length ? overdueBlock(overdue) : ''}
    <div class="inc-months">${months.map(monthCard).join('')}</div>
    ${listBlock('Bez odhadu konce', 'Nejde je naplánovat, dokud nemají estimated konec.', undated)}
    ${listBlock('Bez fakturace', 'Pro bono a interní projekty — žádný příjem.', unbilled, true)}`;

  body.addEventListener('click', (e) => {
    const row = e.target.closest('[data-id]');
    if (row) location.hash = `#/pm/${row.dataset.id}`;
  });
}

function cell(label, value, tone = '') {
  return `<div class="pm-cell">
    <span class="pm-cell-label">${esc(label)}</span>
    <span class="pm-cell-value ${tone}">${value}</span>
  </div>`;
}

function itemRow(item, extraClass = '') {
  return `<div class="inc-item ${extraClass}" data-id="${esc(item.project.id)}">
    <span class="inc-item-name">${esc(item.project.name)}</span>
    <span class="inc-item-date">${esc(formatDate(item.date))}</span>
    <span class="inc-item-amount">${esc(formatMoney(item.amount))}</span>
  </div>`;
}

function monthCard(m) {
  const total = m.items.reduce((s, i) => s + i.amount, 0) + m.sla.amount;
  const empty = !m.items.length && !m.sla.count;

  return `
    <div class="inc-card${empty ? ' inc-card-empty' : ''}">
      <div class="inc-card-head">
        <span class="inc-card-month">${MONTH_NAMES[m.date.getMonth()]} ${m.date.getFullYear()}</span>
        <span class="inc-card-total">${total ? esc(formatMoney(total)) : '—'}</span>
      </div>
      ${m.items.length
        ? m.items.map((i) => itemRow(i)).join('')
        : (m.sla.count ? '' : '<div class="inc-card-none muted">nic naplánovaného</div>')}
      ${m.sla.count ? `
        <div class="inc-sla">
          <span class="inc-item-name">${m.sla.count}× SLA =</span>
          <span class="inc-item-amount">${esc(formatMoney(m.sla.amount))}</span>
        </div>` : ''}
    </div>`;
}

/** Projekty, kterým datum fakturace uteklo a pořád běží. */
function overdueBlock(items) {
  return `
    <h2 class="inc-head">Po termínu fakturace</h2>
    <p class="muted inc-note">Odhadovaný konec + ${INVOICE_LAG_DAYS} dní už uplynul a projekt pořád běží.</p>
    <div class="inc-list">${items.sort((a, b) => a.date - b.date).map((i) => itemRow(i, 'tone-over')).join('')}</div>`;
}

function listBlock(title, note, projects, showType = false) {
  if (!projects.length) return '';
  return `
    <h2 class="inc-head">${esc(title)}</h2>
    <p class="muted inc-note">${esc(note)}</p>
    <div class="inc-list">
      ${projects.map((p) => `
        <div class="inc-item" data-id="${esc(p.id)}">
          <span class="inc-item-name">${esc(p.name)}</span>
          <span class="inc-item-date">${showType
            ? `<span class="status status-frozen">${esc(BILLING_LABEL[p.billing])}</span>`
            : ''}</span>
          <span class="inc-item-amount muted">—</span>
        </div>`).join('')}
    </div>`;
}
