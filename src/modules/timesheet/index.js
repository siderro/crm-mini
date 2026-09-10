// Pracovní výkaz.
//
// Route: #/timesheet        — zadat výkaz
//        #/timesheet/vypis  — moje výkazy, filtrované podle období
//
// Vykazuje se jen do projektů, kde má člověk úroveň 'report' (nastavuje se
// v modulu Projekty nebo v Nastavení). Výkaz patří tomu, kdo ho zapsal —
// tady vidí a upravuje každý jen svoje.

import { esc, formatDate, formatMoney } from '../../util.js';
import { getProjects, projectsFor } from '../projects/store.js';
import { rateResolver } from '../rates/store.js';
import { getEntries, addEntry, updateEntry, deleteEntry, KINDS, KIND_LABEL, KIND_SHORT } from './store.js';

export const timesheet = {
  id: 'timesheet',
  label: 'Pracovní výkaz',
  desc: 'Odpracovaný čas',
  render(mount, subPath = [], ctx = {}) {
    const list = subPath[0] === 'vypis';
    const email = ctx.email || '';

    mount.innerHTML = `
      <div class="ts">
        <div class="page-head"><h1>Pracovní výkaz</h1></div>
        <nav class="subnav">
          <a href="#/timesheet" class="subnav-link${list ? '' : ' active'}">Zadat výkaz</a>
          <a href="#/timesheet/vypis" class="subnav-link${list ? ' active' : ''}">Výpis</a>
        </nav>
        <div id="ts-view"><div class="loading">Načítám…</div></div>
      </div>`;

    const view = mount.querySelector('#ts-view');
    if (list) renderList(view, email);
    else renderForm(view, email);
  },
};

/** Datum jako 'YYYY-MM-DD' (lokální čas), volitelně s posunem o dny. */
function dayString(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Hodiny bez zbytečných desetinných míst. */
function fmtHours(n) {
  return Number(Number(n).toFixed(2)).toLocaleString('cs-CZ');
}

function projectOptions(projects, selected) {
  return projects.map((p) =>
    `<option value="${esc(p.id)}"${p.id === selected ? ' selected' : ''}>${esc(p.name)}</option>`
  ).join('');
}

function kindOptions(selected) {
  return KINDS.map((k) =>
    `<option value="${k}"${k === selected ? ' selected' : ''}>${KIND_LABEL[k]}</option>`
  ).join('');
}

/** Z role na projektu plyne, co člověk obvykle dělá — jen předvyplnění. */
function kindForRole(role) {
  return role === 'manager' ? 'pm' : 'design';
}

// ── Zadání výkazu ──

async function renderForm(view, email) {
  const projects = await projectsFor(email, { level: 'report' });

  if (!projects.length) {
    view.innerHTML = `<div class="empty-state">
      Nemáš přiřazený žádný projekt, do kterého bys mohl vykazovat.
    </div>`;
    return;
  }

  view.innerHTML = `
    <div class="ts-form">
      <label class="ts-field-wide">Projekt
        <select id="ts-project">${projectOptions(projects, projects[0].id)}</select>
      </label>
      <label>Datum
        <div class="ts-date-row">
          <input class="input" id="ts-date" type="date" value="${esc(dayString())}">
          <button class="btn ts-quick" data-day="0">Dnes</button>
          <button class="btn ts-quick" data-day="-1">Včera</button>
        </div>
      </label>
      <label>Hodiny
        <input class="input ts-input-num" id="ts-hours" type="number" min="0" step="0.25" placeholder="0">
      </label>
      <label>Typ práce
        <select id="ts-kind">${kindOptions(kindForRole(projects[0].role))}</select>
      </label>
      <label class="ts-field-wide">Popis
        <textarea class="input ts-note" id="ts-note" rows="4" placeholder="Co se dělalo…"></textarea>
      </label>
    </div>
    <div class="ts-actions">
      <button id="ts-save" class="btn btn-primary">Uložit výkaz</button>
      <span id="ts-msg" class="ts-msg"></span>
    </div>
    <h2 class="ts-section">Zapsáno k tomuhle dni</h2>
    <div id="ts-day"><div class="loading">Načítám…</div></div>`;

  const dateInput = view.querySelector('#ts-date');
  const projectSelect = view.querySelector('#ts-project');
  const kindSelect = view.querySelector('#ts-kind');
  const msg = view.querySelector('#ts-msg');

  // Jiný projekt může mít jinou roli — předvyplnění se posune, volba zůstává na mně.
  projectSelect.addEventListener('change', () => {
    const picked = projects.find((p) => p.id === projectSelect.value);
    kindSelect.value = kindForRole(picked?.role);
  });

  // Rychlá tlačítka místo klikání do kalendáře.
  view.querySelectorAll('.ts-quick').forEach((btn) => {
    btn.addEventListener('click', () => {
      dateInput.value = dayString(Number(btn.dataset.day));
      loadDay(view, email, dateInput.value);
    });
  });

  dateInput.addEventListener('change', () => loadDay(view, email, dateInput.value));

  view.querySelector('#ts-save').addEventListener('click', async () => {
    const hoursInput = view.querySelector('#ts-hours');
    const noteInput = view.querySelector('#ts-note');

    const entry = await addEntry({
      projectId: projectSelect.value,
      email,
      date: dateInput.value,
      hours: hoursInput.value,
      kind: kindSelect.value,
      note: noteInput.value.trim(),
    });

    if (!entry) {
      msg.textContent = 'Vyplň datum a hodiny (víc než nula).';
      msg.className = 'ts-msg error';
      return;
    }

    // Projekt a datum necháváme — obvykle se zapisuje víc věcí za sebou.
    hoursInput.value = '';
    noteInput.value = '';
    msg.textContent = 'Uloženo.';
    msg.className = 'ts-msg ts-msg-ok';
    hoursInput.focus();
    loadDay(view, email, dateInput.value);
  });

  loadDay(view, email, dateInput.value);
}

/** Co už je zapsané k vybranému dni — kontrola, že se něco neduplikuje. */
async function loadDay(view, email, date) {
  const el = view.querySelector('#ts-day');
  const [entries, projects] = await Promise.all([
    getEntries({ email }),
    getProjects({ includeClosed: true }),
  ]);

  const names = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const mine = entries.filter((e) => e.date === date);

  if (!mine.length) {
    el.innerHTML = `<div class="empty-state">K ${esc(formatDate(date))} zatím nic.</div>`;
    return;
  }

  const total = mine.reduce((sum, e) => sum + e.hours, 0);
  el.innerHTML = `
    <div class="ts-day-total muted">${esc(formatDate(date))} · celkem ${esc(fmtHours(total))} h</div>
    ${mine.map((e) => `
      <div class="ts-day-row">
        <span class="ts-day-hours">${esc(fmtHours(e.hours))} h</span>
        <span class="ts-day-project">${esc(names[e.project_id] || 'neznámý projekt')}</span>
        ${e.kind === 'pm' ? `<span class="status status-frozen ts-kind-tag">PM</span>` : ''}
        <span class="ts-day-note muted">${esc(e.note || '')}</span>
      </div>`).join('')}`;
}

// ── Výpis ──

const RANGES = [
  { id: 'month', label: 'Tento měsíc' },
  { id: 'lastmonth', label: 'Minulý měsíc' },
  { id: 'year', label: 'Tento rok' },
  { id: 'all', label: 'Vše' },
];

const DEFAULT_RANGE = 'month';

/** Hranice [od, do) jako 'YYYY-MM-DD'; null = neomezeno. */
function rangeBounds(id) {
  const now = new Date();
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const monthStart = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return iso(d.getFullYear(), d.getMonth(), 1);
  };

  switch (id) {
    case 'month': return [monthStart(0), null];
    case 'lastmonth': return [monthStart(-1), monthStart(0)];
    case 'year': return [iso(now.getFullYear(), 0, 1), null];
    default: return [null, null];
  }
}

function inRange(date, [from, to]) {
  return (from === null || date >= from) && (to === null || date < to);
}

function renderList(view, email) {
  view.innerHTML = `
    <div class="ts-filters">
      ${RANGES.map((r) =>
        `<button class="btn ts-filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
      ).join('')}
    </div>
    <div id="ts-list"><div class="loading">Načítám…</div></div>`;

  view.querySelector('.ts-filters').addEventListener('click', (e) => {
    const range = e.target.dataset.range;
    if (!range) return;
    view.querySelectorAll('.ts-filter').forEach((b) => b.classList.toggle('active', b === e.target));
    loadList(view, email, range);
  });

  loadList(view, email, DEFAULT_RANGE);
}

async function loadList(view, email, range, editingId = null) {
  const el = view.querySelector('#ts-list');
  const [all, projects, reportable] = await Promise.all([
    getEntries({ email }),
    getProjects({ includeClosed: true }),
    projectsFor(email, { level: 'report' }),
  ]);

  const names = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const entries = all.filter((e) => inRange(e.date, rangeBounds(range)));

  if (!entries.length) {
    el.innerHTML = `<div class="empty-state">V tomhle období nic nevykázáno.</div>`;
    return;
  }

  const rateOn = await rateResolver([email]);

  let totalHours = 0;
  let totalCost = 0;
  const rows = [];

  for (const e of entries) {
    totalHours += e.hours;
    const rate = rateOn(e.email, e.date);
    totalCost += rate == null ? 0 : rate * e.hours;

    if (e.id === editingId) {
      rows.push(`
        <tr class="ts-editing" data-id="${esc(e.id)}">
          <td colspan="6">
            <div class="ts-edit">
              <input class="input" data-field="date" type="date" value="${esc(e.date)}">
              <select data-field="project_id">${projectOptions(reportable, e.project_id)}</select>
              <input class="input ts-input-num" data-field="hours" type="number" min="0" step="0.25" value="${esc(e.hours)}">
              <select data-field="kind">${kindOptions(e.kind)}</select>
              <input class="input ts-edit-note" data-field="note" value="${esc(e.note || '')}" placeholder="Popis">
              <button class="btn btn-primary" data-act="save">Uložit</button>
              <button class="btn" data-act="cancel">Zrušit</button>
            </div>
          </td>
        </tr>`);
      continue;
    }

    rows.push(`
      <tr data-id="${esc(e.id)}">
        <td class="ts-date">${esc(formatDate(e.date))}</td>
        <td>${esc(names[e.project_id] || 'neznámý projekt')}</td>
        <td class="ts-kind-cell">${esc(KIND_SHORT[e.kind])}</td>
        <td class="ts-num">${esc(fmtHours(e.hours))} h</td>
        <td class="ts-note-cell">${esc(e.note || '')}</td>
        <td class="ts-row-actions">
          <button class="btn ts-mini" data-act="edit" title="Upravit">✎</button>
          <button class="btn ts-mini btn-danger" data-act="delete" title="Smazat">×</button>
        </td>
      </tr>`);
  }

  el.innerHTML = `
    <div class="ts-sum muted">
      ${entries.length} výkazů · ${esc(fmtHours(totalHours))} h · ${esc(formatMoney(totalCost))}
    </div>
    <table class="table ts-table">
      <thead>
        <tr><th>Datum</th><th>Projekt</th><th>Typ</th><th class="ts-num">Hodiny</th><th>Popis</th><th></th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;

  el.onclick = async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    const row = e.target.closest('tr');
    const id = row.dataset.id;

    if (act === 'edit') { loadList(view, email, range, id); return; }
    if (act === 'cancel') { loadList(view, email, range); return; }

    if (act === 'save') {
      const get = (field) => row.querySelector(`[data-field="${field}"]`).value;
      await updateEntry(id, {
        date: get('date'),
        project_id: get('project_id'),
        hours: get('hours'),
        kind: get('kind'),
        note: get('note').trim(),
      });
      loadList(view, email, range);
      return;
    }

    if (!confirm('Smazat tenhle výkaz?')) return;
    await deleteEntry(id);
    loadList(view, email, range);
  };
}
