// To-Do — vlevo rychlý sběr a raw poznámky, vpravo tikety.
// Route: #/todo (práce) a #/todo/archiv (hotové, textově, pro zpětný pohled).
//
// Tok je jednosměrný: napíšu → odloží se vlevo → překlopím doprava na tiket →
// odškrtnu → spadne do archivu.

import { esc, formatDate, formatDateTime, ageShort, guard, wireKeys } from '../../util.js';
import { getItems, addRawMany, promote, updateText, setDone, deleteItem } from './store.js';

export const todo = {
  id: 'todo',
  label: 'To-Do',
  desc: 'Úkoly a připomínky',
  tileInfo,                // na hubu: počet tiketů a co čeká vlevo
  render(mount, subPath = [], ctx = {}) {
    const archive = subPath[0] === 'archiv';
    const email = ctx.email || '';

    mount.innerHTML = `
      <div class="todo">
        <div class="page-head"><h1>To-Do</h1></div>
        <nav class="subnav">
          <a href="#/todo" class="subnav-link${archive ? '' : ' active'}">Úkoly</a>
          <a href="#/todo/archiv" class="subnav-link${archive ? ' active' : ''}">Archiv</a>
        </nav>
        <div id="todo-view"></div>
      </div>`;

    const view = mount.querySelector('#todo-view');
    guard(view, () => (archive ? renderArchive(view) : renderWork(view, email)));
  },
};

/** Dlaždice na hubu: kolik je rozpracovaných tiketů a co čeká vlevo. */
async function tileInfo() {
  const [tickets, raw] = await Promise.all([getItems('ticket'), getItems('raw')]);
  if (!tickets.length && !raw.length) return null;

  return {
    badge: String(tickets.length),
    alert: raw.length
      ? { text: `${raw.length} ${raw.length === 1 ? 'odložená čeká'
          : (raw.length < 5 ? 'odložené čekají' : 'odložených čeká')}`, tone: 'muted' }
      : null,
  };
}

// ── Pracovní stránka ──

function renderWork(view, email) {
  view.innerHTML = `
    <div class="todo-layout">
      <div class="todo-col">
        <textarea id="todo-capture" class="input todo-capture" rows="3"
          placeholder="Rychlý sběr — každý řádek je jedna poznámka"></textarea>
        <button id="todo-capture-add" class="btn btn-primary todo-capture-btn">Odložit</button>
        <h2 class="section-head">Odložené</h2>
        <div id="todo-raw"><div class="loading">Načítám…</div></div>
      </div>
      <div class="todo-col">
        <h2 class="section-head">Tikety</h2>
        <div id="todo-tickets"><div class="loading">Načítám…</div></div>
      </div>
    </div>`;

  const box = view.querySelector('#todo-capture');

  const odlozit = async () => {
    // Víc řádků = víc poznámek. Vysypat hlavu naráz je celý smysl toho pole,
    // takže Enter tu musí dál dělat nový řádek — potvrzuje Cmd/Ctrl+Enter.
    const lines = box.value.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    await addRawMany(email, lines);
    box.value = '';
    box.focus();
    loadRaw(view);
  };

  wireKeys(box, { submit: odlozit });
  view.querySelector('#todo-capture-add').addEventListener('click', odlozit);

  loadRaw(view);
  loadTickets(view);
}

/**
 * Levý sloupec. Text se edituje prostým kliknutím — odložená poznámka je
 * rozepsaná myšlenka, u ní se nemá o co zakopávat.
 * `editingId` říká, který řádek je zrovna rozklikaný.
 */
async function loadRaw(view, editingId = null) {
  const el = view.querySelector('#todo-raw');
  const items = await getItems('raw');

  if (!items.length) {
    el.innerHTML = `<div class="empty-state">Nic odloženého. Vysyp si hlavu do pole nahoře — každý řádek je jedna poznámka.</div>`;
    return;
  }

  el.innerHTML = items.map((i) => `
    <div class="todo-raw-item" data-id="${esc(i.id)}">
      ${i.id === editingId
        ? `<input class="cell-input todo-edit" value="${esc(i.text)}">`
        : `<span class="todo-raw-text" title="Klikni pro úpravu">${esc(i.text)}</span>`}
      <button class="btn todo-mini" data-act="promote" title="Překlopit na tiket">→</button>
      <button class="btn todo-mini btn-danger" data-act="delete" title="Smazat">×</button>
    </div>`).join('');

  const editing = el.querySelector('.todo-edit');
  if (editing) {
    editing.focus();
    editing.select();
    wireKeys(editing, {
      submit: () => editing.blur(),        // blur uloží, viz onfocusout níž
      cancel: () => loadRaw(view),         // překreslí bez editace = změna se zahodí
    });
  }

  el.onclick = async (e) => {
    const row = e.target.closest('.todo-raw-item');
    if (!row) return;

    if (e.target.classList.contains('todo-raw-text')) {
      loadRaw(view, row.dataset.id);
      return;
    }

    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'promote') await promote(row.dataset.id);
    else await deleteItem(row.dataset.id);

    loadRaw(view);
    loadTickets(view);
  };

  // Odchod z pole = uložení. Prázdný text položku nemaže, jen se zahodí změna.
  el.onfocusout = async (e) => {
    if (!e.target.classList.contains('todo-edit')) return;
    const row = e.target.closest('.todo-raw-item');
    if (e.target.value.trim()) await updateText(row.dataset.id, e.target.value);
    loadRaw(view);
  };
}

/**
 * Pravý sloupec. Tiket se needituje omylem — text je obyčejný, tužka se
 * ukáže až na hover. U každého je stáří od překlopení doprava.
 *
 * Dole zůstává, co jsem dnes odškrtl — přeškrtnuté. Do archivu to spadne
 * až zítra, ať je přes den vidět, co už je za mnou (a jde to vrátit).
 */
async function loadTickets(view, editingId = null) {
  const el = view.querySelector('#todo-tickets');
  const open = await getItems('ticket');
  const doneToday = (await getItems('done'))
    .filter((i) => new Date(i.done_at).getTime() >= startOfDay(new Date()));

  if (!open.length && !doneToday.length) {
    el.innerHTML = `<div class="empty-state">Žádné tikety. Překlop něco zleva.</div>`;
    return;
  }

  const ticketHtml = (i) => {
    const since = i.promoted_at || i.created_at;   // starší tikety razítko nemají
    return `
    <div class="todo-ticket" data-id="${esc(i.id)}">
      <input type="checkbox" class="todo-check" title="Hotovo">
      ${i.id === editingId
        ? `<input class="cell-input todo-edit" value="${esc(i.text)}">`
        : `<span class="todo-ticket-text">${esc(i.text)}</span>`}
      <span class="todo-age" title="V tiketech od ${esc(formatDateTime(since))}">${esc(ageShort(since))}</span>
      <span class="todo-actions">
        <button class="btn todo-mini" data-act="edit" title="Upravit">✎</button>
        <button class="btn todo-mini btn-danger" data-act="delete" title="Smazat">×</button>
      </span>
    </div>`;
  };

  const doneHtml = (i) => `
    <div class="todo-ticket todo-ticket-done" data-id="${esc(i.id)}">
      <input type="checkbox" class="todo-check" checked title="Vrátit mezi tikety">
      <span class="todo-ticket-text">${esc(i.text)}</span>
      <span class="todo-age" title="Hotovo ${esc(formatDateTime(i.done_at))}">hotovo</span>
      <span class="todo-actions">
        <button class="btn todo-mini btn-danger" data-act="delete" title="Smazat">×</button>
      </span>
    </div>`;

  el.innerHTML = open.map(ticketHtml).join('') + doneToday.map(doneHtml).join('');

  const editing = el.querySelector('.todo-edit');
  if (editing) {
    editing.focus();
    editing.select();
    wireKeys(editing, {
      submit: () => editing.blur(),        // blur uloží, viz onfocusout níž
      cancel: () => loadTickets(view),     // překreslí bez editace = změna se zahodí
    });
  }

  el.onchange = async (e) => {
    if (!e.target.classList.contains('todo-check')) return;
    await setDone(e.target.closest('.todo-ticket').dataset.id, e.target.checked);
    loadTickets(view);
  };

  el.onclick = async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    const id = e.target.closest('.todo-ticket').dataset.id;

    if (act === 'edit') { loadTickets(view, id); return; }
    await deleteItem(id);
    loadTickets(view);
  };

  el.onfocusout = async (e) => {
    if (!e.target.classList.contains('todo-edit')) return;
    const row = e.target.closest('.todo-ticket');
    if (e.target.value.trim()) await updateText(row.dataset.id, e.target.value);
    loadTickets(view);
  };
}

// ── Archiv ──
//
// Filtr = časový rozsah [od, do), ne přihrádka. „Dnes" a „Včera" proto leží
// uvnitř „Tento týden" — tak to člověk při zpětném pohledu čte.

export const RANGES = [
  { id: 'today', label: 'Dnes' },
  { id: 'yesterday', label: 'Včera' },
  { id: 'week', label: 'Tento týden' },
  { id: 'lastweek', label: 'Minulý týden' },
  { id: 'month', label: 'Minulý měsíc' },
  { id: 'older', label: 'Starší' },
  { id: 'all', label: 'Vše' },
];

export const DEFAULT_RANGE = 'week';

/** Půlnoc daného dne. */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return +d;
}

/** Pondělí toho týdne, do kterého datum spadá, v 00:00. */
export function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // Po = 0
  return +d;
}

/** Hranice [od, do) pro každý filtr; null = neomezeno. */
export function rangeBounds(id) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const thisWeek = startOfWeek(now);
  const lastWeek = thisWeek - 7 * 86400000;
  const prevMonth = +new Date(now.getFullYear(), now.getMonth() - 1, 1);

  switch (id) {
    case 'today': return [today, null];
    case 'yesterday': return [yesterday, today];
    case 'week': return [thisWeek, null];
    case 'lastweek': return [lastWeek, thisWeek];
    case 'month': return [prevMonth, lastWeek];
    case 'older': return [null, prevMonth];
    default: return [null, null];
  }
}

export function inRange(doneAt, [from, to]) {
  const t = new Date(doneAt).getTime();
  if (Number.isNaN(t)) return from === null;
  return (from === null || t >= from) && (to === null || t < to);
}

function renderArchive(view) {
  view.innerHTML = `
    <div class="filter-bar">
      ${RANGES.map((r) =>
        `<button class="btn filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
      ).join('')}
    </div>
    <div id="todo-archive"><div class="loading">Načítám…</div></div>`;

  view.querySelector('.filter-bar').addEventListener('click', (e) => {
    const range = e.target.dataset.range;
    if (!range) return;
    view.querySelectorAll('.filter').forEach((b) => b.classList.toggle('active', b === e.target));
    loadArchive(view, range);
  });

  loadArchive(view, DEFAULT_RANGE);
}

async function loadArchive(view, range) {
  const el = view.querySelector('#todo-archive');
  const bounds = rangeBounds(range);
  const items = (await getItems('done')).filter((i) => inRange(i.done_at, bounds));

  if (!items.length) {
    el.innerHTML = `<div class="empty-state">V tomhle období nic hotového.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="todo-archive-count muted">${items.length} hotových</div>
    <ul class="todo-archive-list">
      ${items.map((i) => `
        <li><span class="todo-archive-date">${esc(formatDate(i.done_at))}</span>${esc(i.text)}</li>
      `).join('')}
    </ul>`;
}
