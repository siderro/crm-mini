// Finance výhled — co přijde a co odejde v následujících měsících.
//
// Jen plán, ne historie: co se vyfakturovalo a co je zaplacené, tady není.
//
// Nahoře se zapínají zdroje (fakturace, SLA, náklady, mzdy), dole je dvanáct
// karet měsíců s rozpadem a čistým zůstatkem. Tenhle soubor o financích neví
// nic — každý zdroj si svoje čísla spočítá sám v `sources/`, tady se jen
// sčítají znaménka a kreslí.
//
// Vznikl z modulu „Příjmy výhled". Ten byl podmnožinou tohohle, takže by se
// vedle sebe nedalo poznat, do kterého se dívat.

import { esc, formatDate, formatMoney, formatMoneyShort, MONTH_NAMES } from '../../util.js';
import { BILLING_LABEL } from '../projects/store.js';
import {
  RANGES, DEFAULT_RANGE, monthsFor, rangeTotalLabel,
  makeCache, foldMonths, horizonTotals, sourceTotal, enabledFrom,
} from './logic.js';
import { SOURCES, DEFAULT_SOURCE_IDS } from './sources/index.js';
import { INVOICE_LAG_DAYS } from './sources/invoices.js';

const STORAGE_KEY = 'brevis.finance.sources';

export const finance = {
  id: 'finance',
  label: 'Finance výhled',
  desc: 'Co přijde a co odejde v následujících měsících',
  superadminOnly: true,    // peníze se nerozdávají, stejně jako Výplaty
  tileInfo,
  render(mount) {
    mount.innerHTML = `
      <div class="fin">
        <div class="page-head"><h1>Finance výhled</h1></div>
        <p class="lead">
          Odhad fakturace: konec projektu + ${INVOICE_LAG_DAYS} dní, cena projektu včetně
          project managementu. SLA se účtuje zvlášť za každý měsíc, ve kterém projekt běží.
          Náklady přicházejí z modulu Náklady.
        </p>
        <div class="filter-bar">
          ${RANGES.map((r) =>
            `<button class="btn filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
          ).join('')}
        </div>
        <div id="fin-sources" class="fin-sources"></div>
        <div id="fin-body"><div class="loading">Načítám…</div></div>
      </div>`;

    let range = DEFAULT_RANGE;

    mount.querySelector('.filter-bar').addEventListener('click', (e) => {
      const next = e.target.dataset.range;
      if (!next) return;
      range = next;
      mount.querySelectorAll('.filter').forEach((b) => b.classList.toggle('active', b === e.target));
      load(mount, range);
    });

    renderSourceRow(mount.querySelector('#fin-sources'), loadEnabled());

    mount.querySelector('#fin-sources').addEventListener('change', (e) => {
      if (!e.target.dataset.source) return;
      saveEnabled([...mount.querySelectorAll('[data-source]')]
        .filter((c) => c.checked).map((c) => c.dataset.source));
      load(mount, range);
    });

    load(mount, DEFAULT_RANGE);
  },
};

// ── Volba zdrojů ──
//
// Drží se v prohlížeči, ne v databázi: je to nastavení pohledu, ne data.
// Neznámé id se zahazují, ať přejmenovaný zdroj nezmizí potichu do prázdna.

const KNOWN_SOURCE_IDS = SOURCES.map((s) => s.id);

function loadEnabled() {
  try {
    return enabledFrom(JSON.parse(localStorage.getItem(STORAGE_KEY)), KNOWN_SOURCE_IDS, DEFAULT_SOURCE_IDS);
  } catch {
    return DEFAULT_SOURCE_IDS;
  }
}

function saveEnabled(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Soukromé okno bez úložiště. Volba prostě nepřežije obnovení stránky.
  }
}

// ── Dlaždice na hubu ──

/** Čistý zůstatek tohohle měsíce ze zapnutých zdrojů. */
async function tileInfo() {
  const enabled = loadEnabled();
  const sources = SOURCES.filter((s) => enabled.includes(s.id));
  if (!sources.length) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);

  const cache = makeCache();
  const data = {};
  await Promise.all(sources.map(async (s) => { data[s.id] = await s.load(cache); }));

  const [m] = foldMonths([month], sources, data);
  if (!m.income && !m.expense) return null;

  const invoices = data.invoices;
  const overdue = invoices ? invoices.overdue.length : 0;

  return {
    badge: formatMoneyShort(m.net),
    alert: overdue
      ? { text: `${overdue} po termínu fakturace`, tone: 'over' }
      : (m.net < 0 ? { text: 'tenhle měsíc odchází víc, než přijde', tone: 'over' } : null),
  };
}

// ── Načtení a vykreslení ──

async function load(mount, rangeId) {
  const body = mount.querySelector('#fin-body');
  const enabled = loadEnabled();
  const sources = SOURCES.filter((s) => enabled.includes(s.id));

  // Zaškrtávátka se nepřekreslují — jen se u nich doplní součty, až je známe.
  // Překreslení by přepsalo klik, který přišel během načítání.
  showSourceTotals(mount, null);

  if (!sources.length) {
    body.innerHTML = `<div class="empty-state">Všechny zdroje jsou vypnuté. Zapni aspoň jeden.</div>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const months = monthsFor(rangeId, today);

  let data;
  try {
    const cache = makeCache();
    data = {};
    await Promise.all(sources.map(async (s) => { data[s.id] = await s.load(cache); }));
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  const folded = foldMonths(months, sources, data);
  const totals = horizonTotals(folded);

  showSourceTotals(mount, folded);

  body.innerHTML = `
    <div class="summary">
      ${cell('Přijde', esc(formatMoney(totals.income)))}
      ${cell('Odejde', esc(formatMoney(totals.expense)))}
      ${cell(`Zůstatek — ${rangeTotalLabel(rangeId)}`,
        `<strong>${esc(formatMoney(totals.net))}</strong>`, totals.net < 0 ? 'tone-over' : '')}
    </div>
    <div class="fin-months">${folded.map(monthCard).join('')}</div>
    ${extras(data, sources)}`;

  // Přiřazení, ne addEventListener: `#fin-body` se nemění, mění se jen jeho
  // obsah — každé načtení by jinak přilepilo další posluchač.
  body.onclick = (e) => {
    const row = e.target.closest('[data-id]');
    if (row) location.hash = `#/pm/${row.dataset.id}`;
  };
}

/** Zaškrtávátka zdrojů. Kreslí se jednou při otevření modulu. */
function renderSourceRow(el, enabled) {
  el.innerHTML = SOURCES.map((s) => `
    <label class="fin-source${s.sign > 0 ? ' fin-source-in' : ' fin-source-out'}"
           ${s.note ? `title="${esc(s.note)}"` : ''}>
      <input type="checkbox" data-source="${esc(s.id)}"${enabled.includes(s.id) ? ' checked' : ''}>
      <span class="fin-source-label">${esc(s.label)}</span>
      <span class="fin-source-total" data-total="${esc(s.id)}"></span>
    </label>`).join('');
}

/** Součet za horizont u každého zdroje, ať je vidět, co kolik váží. */
function showSourceTotals(mount, folded) {
  for (const s of SOURCES) {
    const el = mount.querySelector(`[data-total="${CSS.escape(s.id)}"]`);
    if (!el) continue;
    const on = folded?.some((m) => m.rows.some((r) => r.source.id === s.id));
    el.textContent = on
      ? `${s.sign > 0 ? '+' : '−'} ${formatMoneyShort(sourceTotal(folded, s.id))}`
      : '';
  }
}

function cell(label, value, tone = '') {
  return `<div class="summary-cell">
    <span class="summary-label">${esc(label)}</span>
    <span class="summary-value ${tone}">${value}</span>
  </div>`;
}

// ── Karta měsíce ──

function itemRow(item, sign) {
  const amount = `${sign < 0 ? '−' : ''}${formatMoney(item.amount)}`;
  return `<div class="fin-item${sign < 0 ? ' fin-item-out' : ''}"${item.projectId ? ` data-id="${esc(item.projectId)}"` : ''}>
    <span class="fin-item-name">${esc(item.label)}</span>
    <span class="fin-item-date">${item.date ? esc(formatDate(item.date)) : ''}</span>
    <span class="fin-item-amount">${esc(amount)}</span>
  </div>`;
}

function monthCard(m) {
  const income = m.rows.filter((r) => r.source.sign > 0).flatMap((r) => r.items.map((i) => itemRow(i, +1)));
  const expense = m.rows.filter((r) => r.source.sign < 0).flatMap((r) => r.items.map((i) => itemRow(i, -1)));
  // Podle částek, ne podle řádků rozpadu: zdroj nemusí rozpad umět, a karta
  // s nenulovým zůstatkem se nesmí tvářit, že je v ní prázdno.
  const empty = !m.income && !m.expense;

  return `
    <div class="fin-card${empty ? ' fin-card-empty' : ''}">
      <div class="fin-card-head">
        <span class="fin-card-month">${MONTH_NAMES[m.date.getMonth()]} ${m.date.getFullYear()}</span>
        <span class="fin-card-total${m.net < 0 ? ' tone-over' : ''}">${empty ? '—' : esc(formatMoney(m.net))}</span>
      </div>
      ${income.join('')}
      ${expense.length ? `<div class="fin-card-split"></div>${expense.join('')}` : ''}
      ${empty ? '<div class="fin-card-none muted">nic naplánovaného</div>' : ''}
    </div>`;
}

// ── Bloky pod kartami ──
//
// Patří k fakturaci projektů, takže se ukazují, jen když je ten zdroj zapnutý.

function extras(data, sources) {
  if (!sources.some((s) => s.id === 'invoices')) return '';
  const { overdue, undated, unbilled } = data.invoices;

  return `
    ${overdue.length ? overdueBlock(overdue) : ''}
    ${listBlock('Bez odhadu konce', 'Nejde je naplánovat, dokud nemají plánovaný konec.', undated)}
    ${listBlock('Bez fakturace', 'Pro bono a interní projekty — žádný příjem.', unbilled, true)}`;
}

/** Projekty, kterým datum fakturace uteklo a pořád běží. */
function overdueBlock(items) {
  const rows = items
    .sort((a, b) => a.date - b.date)
    .map((i) => `<div class="fin-item tone-over" data-id="${esc(i.project.id)}">
      <span class="fin-item-name">${esc(i.project.name)}</span>
      <span class="fin-item-date">${esc(formatDate(i.date))}</span>
      <span class="fin-item-amount">${esc(formatMoney(i.amount))}</span>
    </div>`).join('');

  return `
    <h2 class="section-head">Po termínu fakturace</h2>
    <p class="note">Odhadovaný konec + ${INVOICE_LAG_DAYS} dní už uplynul a projekt pořád běží.</p>
    <div class="fin-list">${rows}</div>`;
}

function listBlock(title, note, projects, showType = false) {
  if (!projects.length) return '';
  return `
    <h2 class="section-head">${esc(title)}</h2>
    <p class="note">${esc(note)}</p>
    <div class="fin-list">
      ${projects.map((p) => `
        <div class="fin-item" data-id="${esc(p.id)}">
          <span class="fin-item-name">${esc(p.name)}</span>
          <span class="fin-item-date">${showType
            ? `<span class="status status-frozen">${esc(BILLING_LABEL[p.billing])}</span>`
            : ''}</span>
          <span class="fin-item-amount muted">—</span>
        </div>`).join('')}
    </div>`;
}
