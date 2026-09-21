// Náklady — pravidelné a jednorázové výdaje mimo mzdy.
//
// Route: #/costs (pravidelné) a #/costs/jednorazove.
//
// Dvě záložky, jedna tabulka. Pravidelné jsou to, co odchází pořád (nájem,
// software, pojištění); jednorázové jsou nebagatelní výdaje s datem (oprava
// auta, nový notebook). Oboje pak sčítá Finance výhled.
//
// Mzdy sem nepatří — ty umí Výplaty, a počítají se z výkazů a sazeb.

import {
  esc, formatDate, formatMoney, formatMoneyShort, guard, wireKeys, flash, MONTH_NAMES, MONTH_IN,
} from '../../util.js';
import {
  listCosts, addCost, updateCost, deleteCost,
  monthlyEquivalent, thisMonth, activeIn, parseDay, today,
} from './store.js';

export const costs = {
  id: 'costs',
  label: 'Náklady',
  desc: 'Pravidelné a jednorázové výdaje mimo mzdy',
  superadminOnly: true,      // peníze se nerozdávají, stejně jako Výplaty
  tileInfo,
  render(mount, subPath = []) {
    const kind = subPath[0] === 'jednorazove' ? 'onetime' : 'recurring';

    mount.innerHTML = `
      <div class="cost">
        <div class="page-head">
          <h1>Náklady</h1>
          <button id="cost-add" class="btn btn-primary">+ Nový náklad</button>
        </div>
        <nav class="subnav">
          <a href="#/costs" class="subnav-link${kind === 'recurring' ? ' active' : ''}">Pravidelné</a>
          <a href="#/costs/jednorazove" class="subnav-link${kind === 'onetime' ? ' active' : ''}">Jednorázové</a>
        </nav>
        <p class="lead">${esc(LEAD[kind])}</p>
        <div id="cost-new"></div>
        <div id="cost-body"><div class="loading">Načítám…</div></div>
      </div>`;

    mount.querySelector('#cost-add').addEventListener('click', () => openNew(mount, kind));

    load(mount, kind);
  },
};

const LEAD = {
  recurring: 'Co odchází každý měsíc nebo jednou za rok. Mzdy sem nepatří — ty jsou ve Výplatách.',
  onetime: 'Nebagatelní výdaje s očekávaným datem. Drobnosti sem necpi, jen by zašuměly výhled.',
};

/** Dlaždice na hubu: kolik nás pravidelné náklady stojí měsíčně a co se blíží. */
async function tileInfo() {
  const all = await listCosts();
  if (!all.length) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const soon = all.filter((c) => {
    if (c.kind !== 'onetime') return false;
    const due = parseDay(c.due_date);
    return due && due >= now && due <= horizon;
  });
  const soonTotal = soon.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const monthly = monthlyEquivalent(all, thisMonth());
  if (!monthly && !soon.length) return null;

  return {
    badge: monthly ? `${formatMoneyShort(monthly)}/měs` : null,
    alert: soon.length
      ? { text: `${jednorazove(soon.length)} do 30 dní za ${formatMoneyShort(soonTotal)}`, tone: 'warn' }
      : null,
  };
}

/** Skloňování — špatný tvar vypadá jako chyba programu. */
function jednorazove(n) {
  if (n === 1) return '1 jednorázový výdaj';
  if (n >= 2 && n <= 4) return `${n} jednorázové výdaje`;
  return `${n} jednorázových výdajů`;
}

async function load(mount, kind, { openId = null, flashText = '' } = {}) {
  const body = mount.querySelector('#cost-body');

  let rows;
  try {
    rows = await listCosts(kind);
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  renderTable(body, rows, kind, mount);

  if (openId) {
    const row = body.querySelector(`tr[data-id="${openId}"]`);
    if (row) await toggleRow(row, mount, kind, flashText);
  }
}

// ── Souhrn ──

function summary(rows, kind) {
  if (!rows.length) return '';

  const cell = (label, value) => `<div class="summary-cell">
    <span class="summary-label">${esc(label)}</span>
    <span class="summary-value">${value}</span>
  </div>`;

  if (kind === 'recurring') {
    const monthly = monthlyEquivalent(rows, thisMonth());
    const platne = rows.filter((c) => activeIn(c, thisMonth()));
    const yearly = platne.filter((c) => c.period === 'yearly');
    const skoncilo = rows.length - platne.length;
    return `<div class="summary">
      ${cell('Měsíčně v průměru', `<strong>${esc(formatMoney(Math.round(monthly)))}</strong>`)}
      ${cell('Ročně', esc(formatMoney(Math.round(monthly * 12))))}
      ${cell('Platných položek', `${platne.length}${yearly.length ? ` · z toho ${yearly.length} ročních` : ''}`)}
      ${skoncilo ? cell('Ukončených', skoncilo) : ''}
    </div>`;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = rows.filter((c) => { const d = parseDay(c.due_date); return d && d >= now; });
  const total = future.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return `<div class="summary">
    ${cell('Čeká nás', `<strong>${esc(formatMoney(total))}</strong>`)}
    ${cell('Položek dopředu', future.length)}
    ${cell('Už proběhlo', rows.length - future.length)}
  </div>`;
}

// ── Tabulka ──

/** Kdy se položka platí, lidsky. */
function whenText(c) {
  if (c.kind === 'onetime') return formatDate(c.due_date);
  if (c.period === 'yearly') return `ročně v ${MONTH_IN[Number(c.due_month) - 1] || '?'}`;
  return 'každý měsíc';
}

/** Dokdy položka platí. Prázdno znamená „pořád", ne „nevíme". */
function untilText(c) {
  if (c.kind === 'onetime') return '';
  if (!c.valid_to) return '<span class="muted">napořád</span>';

  const to = parseDay(c.valid_to);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const label = esc(`do ${formatDate(c.valid_to)}`);
  return to && to < now ? `<span class="tone-muted">skončilo ${label}</span>` : label;
}

function renderTable(body, rows, kind, mount) {
  if (!rows.length) {
    body.innerHTML = `<div class="empty-state">${esc(EMPTY[kind])}</div>`;
    return;
  }

  const tr = rows.map((c) => `
    <tr class="cost-row" data-id="${esc(c.id)}">
      <td class="cost-name">${esc(c.name)}</td>
      <td class="cost-amount">${esc(formatMoney(c.amount))}</td>
      <td class="cost-when">${esc(whenText(c))}</td>
      <td class="cost-until">${untilText(c)}</td>
      <td class="cost-note muted">${esc(preview(c.note))}</td>
    </tr>`).join('');

  body.innerHTML = `
    ${summary(rows, kind)}
    <div class="table-scroll"><table class="table cost-table">
      <thead>
        <tr>
          <th>Název</th>
          <th class="cost-amount">Částka</th>
          <th>${kind === 'onetime' ? 'Očekáváno' : 'Kdy'}</th>
          <th>${kind === 'onetime' ? '' : 'Platnost'}</th>
          <th>Poznámka</th>
        </tr>
      </thead>
      <tbody>${tr}</tbody>
    </table></div>`;

  body.querySelector('tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr.cost-row');
    if (row) toggleRow(row, mount, kind);
  });
}

const EMPTY = {
  recurring: 'Zatím žádné pravidelné náklady. Přidej první přes „+ Nový náklad" — nájem, software, pojištění.',
  onetime: 'Zatím žádné jednorázové náklady. Přidej první přes „+ Nový náklad" — třeba opravu auta nebo nový notebook.',
};

function preview(note) {
  const text = (note || '').replace(/\s+/g, ' ').trim();
  return text.length > 50 ? text.slice(0, 50) + '…' : text;
}

// ── Formulář ──

/**
 * Pole se jmenují jako sloupce v databázi, takže readForm() jde poslat rovnou
 * do storu. Stejný vzor jako v Projektech.
 */
function formFields(kind, c = {}) {
  const v = (key) => esc(c[key] ?? '');
  const yearly = c.period === 'yearly';

  const common = `
    <label class="cost-field-wide">Název
      <input class="input" data-field="name" value="${v('name')}" placeholder="Za co se platí"></label>
    <label>Částka
      <input class="input cell-num" data-field="amount" type="number" step="1" min="0" value="${v('amount')}"></label>`;

  if (kind === 'onetime') {
    return `<div class="cost-form">
      ${common}
      <label>Očekávané datum
        <input class="input" data-field="due_date" type="date" value="${v('due_date')}"></label>
    </div>`;
  }

  return `<div class="cost-form">
    ${common}
    <label class="cost-check">
      <input type="checkbox" data-field="yearly"${yearly ? ' checked' : ''}> Roční platba
    </label>
    <label class="cost-month${yearly ? '' : ' hidden'}">Měsíc platby
      <select class="input" data-field="due_month">
        ${MONTH_NAMES.map((m, i) =>
          `<option value="${i + 1}"${Number(c.due_month) === i + 1 ? ' selected' : ''}>${esc(m)}</option>`
        ).join('')}
      </select>
    </label>
    <label>Platí od
      <input class="input" data-field="valid_from" type="date" value="${esc(c.valid_from || today())}"></label>
    <label>Platí do
      <input class="input" data-field="valid_to" type="date" value="${v('valid_to')}"></label>
  </div>`;
}

function noteField(c = {}) {
  return `<label class="cost-note-label">Poznámka
    <textarea class="input cost-note-input" data-field="note" rows="2">${esc(c.note ?? '')}</textarea>
  </label>`;
}

function readForm(scope, kind) {
  const get = (field) => scope.querySelector(`[data-field="${field}"]`)?.value ?? '';
  const base = { kind, name: get('name'), amount: get('amount'), note: get('note') };

  if (kind === 'onetime') return { ...base, due_date: get('due_date') };

  const yearly = scope.querySelector('[data-field="yearly"]').checked;
  return {
    ...base,
    period: yearly ? 'yearly' : 'monthly',
    due_month: yearly ? get('due_month') : null,
    valid_from: get('valid_from'),
    valid_to: get('valid_to'),
  };
}

/** Checkbox „roční platba" odkrývá výběr měsíce. Nic skrytého, jen nepotřebného. */
function wireYearly(scope) {
  const check = scope.querySelector('[data-field="yearly"]');
  if (!check) return;
  check.addEventListener('change', () => {
    scope.querySelector('.cost-month').classList.toggle('hidden', !check.checked);
  });
}

function msgOf(scope) {
  return scope.querySelector('.form-msg');
}

const INVALID = {
  recurring: 'Položka potřebuje název, částku a u roční platby měsíc. „Platí do" nesmí být před „platí od".',
  onetime: 'Položka potřebuje název, částku a očekávané datum.',
};

// ── Nová položka ──

function openNew(mount, kind) {
  const holder = mount.querySelector('#cost-new');
  if (holder.innerHTML) { holder.innerHTML = ''; return; }

  holder.innerHTML = `
    <div class="cost-panel form-wide">
      ${formFields(kind)}
      ${noteField()}
      <div class="form-msg"></div>
      <div class="form-actions">
        <span class="form-actions-gap"></span>
        <button class="btn" data-act="cancel">Zrušit</button>
        <button class="btn btn-primary" data-act="create">Přidat</button>
      </div>
    </div>`;

  const panel = holder.querySelector('.cost-panel');
  wireYearly(panel);
  panel.querySelector('[data-field="name"]').focus();

  const zavrit = () => { holder.innerHTML = ''; };

  const pridat = async () => {
    const created = await addCost(readForm(panel, kind));
    if (!created) { flash(msgOf(panel), INVALID[kind], 'error'); return; }
    zavrit();
    await load(mount, kind);
  };

  wireKeys(panel, { submit: pridat, cancel: zavrit });

  panel.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (act === 'cancel') zavrit();
    else if (act === 'create') pridat();
  });
}

// ── Rozbalený řádek ──

function toggleRow(row, mount, kind, flashText = '') {
  const open = row.nextElementSibling;
  if (open && open.classList.contains('cost-detail')) {
    open.remove();
    row.classList.remove('expanded');
    return;
  }
  // Vždycky jen jeden otevřený panel.
  const table = row.closest('table');
  table.querySelectorAll('tr.cost-detail').forEach((tr) => tr.remove());
  table.querySelectorAll('tr.expanded').forEach((tr) => tr.classList.remove('expanded'));

  row.classList.add('expanded');
  // Chyba nesmí nechat řádek rozbalený a prázdný — vypíše se místo tabulky,
  // stejně jako když selže samotné načtení.
  return guard(mount.querySelector('#cost-body'), () => openDetail(row, mount, kind, flashText));
}

async function openDetail(row, mount, kind, flashText = '') {
  const id = row.dataset.id;

  // Hodnoty z dat, ne z textu v buňkách — formátovaná částka by se uložila zpátky zkomolená.
  const cost = (await listCosts(kind)).find((c) => c.id === id);
  if (!cost) return;

  row.insertAdjacentHTML('afterend', `
    <tr class="cost-detail">
      <td colspan="5">
        <div class="form-wide">
        ${formFields(kind, cost)}
        ${noteField(cost)}
        <div class="form-msg"></div>
        <div class="form-actions">
          <button class="btn btn-danger" data-act="delete">Smazat</button>
          <span class="form-actions-gap"></span>
          <button class="btn" data-act="close">Zrušit</button>
          <button class="btn btn-primary" data-act="save">Uložit změny</button>
        </div>
        </div>
      </td>
    </tr>`);

  const detail = row.nextElementSibling;
  wireYearly(detail);
  if (flashText) flash(msgOf(detail), flashText);

  const ulozit = async () => {
    const saved = await updateCost(id, readForm(detail, kind));
    if (!saved) { flash(msgOf(detail), INVALID[kind], 'error'); return; }
    await load(mount, kind, { openId: id, flashText: 'Uloženo.' });
  };

  const zavrit = () => toggleRow(row, mount, kind);

  wireKeys(detail, { submit: ulozit, cancel: zavrit });

  detail.addEventListener('click', async (e) => {
    const act = e.target.dataset.act;
    if (act === 'save') { await ulozit(); return; }
    if (act === 'close') { zavrit(); return; }

    if (act === 'delete') {
      if (!confirm(`Smazat „${cost.name}"?`)) return;
      await deleteCost(id);
      await load(mount, kind);
    }
  });
}
