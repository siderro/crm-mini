// Pracovní výkaz.
//
// Route: #/timesheet        — můj výkaz, filtrovaný podle období
//        #/timesheet/rucne  — zápis rukou, když se zapomnělo trackovat
//
// Stopky se ovládají z dlaždice na hubu (viz renderTile níž). Po jejich
// zastavení čeká naměřený čas na doplnění projektu — panel na to se ukáže
// nahoře v Mém výkazu, kam Stop z dlaždice odkáže.
//
// Vykazuje se jen do projektů, kde má člověk úroveň 'report' (nastavuje se
// v modulu Projekty nebo v Nastavení). Výkaz patří tomu, kdo ho zapsal —
// tady vidí a upravuje každý jen svoje.

import { esc, formatDate, formatMoney, guard, wireKeys, flash } from '../../util.js';
import { getProjects, projectsFor } from '../projects/store.js';
import { SUPERADMIN_EMAILS } from '../../config.js';

// Komu napsat, když člověk nemá kam vykazovat.
const CONTACT = SUPERADMIN_EMAILS[0];
import { rateResolver } from '../rates/store.js';
import { getEntries, addEntry, updateEntry, deleteEntry, KINDS, KIND_LABEL, KIND_SHORT } from './store.js';
import {
  readTracker, startTracker, pauseTracker, resumeTracker, stopTracker, clearTracker,
  elapsedMs, formatDuration, toHours, trackedDay,
} from './tracker.js';

export const timesheet = {
  id: 'timesheet',
  label: 'Pracovní výkaz',
  desc: 'Odpracovaný čas',
  renderTile,              // stopky jdou ovládat rovnou z dlaždice na hubu
  renderMini,              // a připomínají se v hlavičce, když někde jinde běží
  render(mount, subPath = [], ctx = {}) {
    const page = subPath[0] || 'mine';
    const email = ctx.email || '';

    const tab = (id, href, label) =>
      `<a href="${href}" class="subnav-link${page === id ? ' active' : ''}">${label}</a>`;

    mount.innerHTML = `
      <div class="ts">
        <div class="page-head"><h1>Pracovní výkaz</h1></div>
        <nav class="subnav">
          ${tab('mine', '#/timesheet', 'Můj výkaz')}
          ${tab('rucne', '#/timesheet/rucne', 'Zadat ručně')}
        </nav>
        <div id="ts-view"><div class="loading">Načítám…</div></div>
      </div>`;

    const view = mount.querySelector('#ts-view');
    guard(view, () => (page === 'rucne' ? renderForm(view, email) : renderMine(view, email)));
  },
};

// ── Stopky ──
//
// Ovládání je na dlaždici hubu; tady zůstává jen to, co se dělá s naměřeným
// časem — doplnit projekt a popis a udělat z toho výkaz.

/**
 * Malé stopky v hlavičce — připomínka, že něco běží, když jsi jinde v systému.
 * Když se nic neměří, nevykreslí se nic; hlavička má zůstat klidná.
 */
function renderMini(el) {
  const t = readTracker();
  if (!t) { el.innerHTML = ''; return; }

  if (t.stopped) {
    el.innerHTML = `
      <a href="#/timesheet" class="mini" title="Naměřený čas čeká na doplnění">
        <span class="mini-dot mini-waiting"></span>
        <span class="mini-clock">${formatDuration(elapsedMs(t))}</span>
        <span class="mini-label">čeká na uložení</span>
      </a>`;
    return;
  }

  const running = !!t.running;

  el.innerHTML = `
    <div class="mini">
      <span class="mini-dot${running ? ' mini-live' : ''}"></span>
      <a href="#/timesheet" class="mini-clock" title="${running ? 'Měří se' : 'Pozastaveno'}">${formatDuration(elapsedMs(t))}</a>
      <button class="btn mini-btn" data-act="${running ? 'pause' : 'resume'}">${running ? 'Pauza' : 'Pokračovat'}</button>
      <button class="btn mini-btn" data-act="stop">Stop</button>
    </div>`;

  if (running) {
    const clock = el.querySelector('.mini-clock');
    const timer = setInterval(() => {
      // Hlavička se překresluje při každé navigaci — starý interval se uklidí sám.
      if (!document.contains(clock)) { clearInterval(timer); return; }
      clock.textContent = formatDuration(elapsedMs(readTracker()));
    }, 1000);
  }

  el.querySelector('.mini').addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'pause') pauseTracker();
    else if (act === 'resume') resumeTracker();
    else if (act === 'stop') {
      stopTracker();
      location.hash = '#/timesheet';
      return;
    }
    renderMini(el);
  });
}

/**
 * Stopky na dlaždici hubu. Umí spustit, pauzu i stop; doplnit projekt a popis
 * se chodí do modulu — na dlaždici by na to nebylo místo a bylo by to matoucí.
 */
function renderTile(el) {
  const t = readTracker();

  if (t?.stopped) {
    el.innerHTML = `
      <div class="tile-clock">${formatDuration(elapsedMs(t))}</div>
      <div class="tile-tracker-state muted">čeká na uložení</div>
      <div class="tile-tracker-buttons">
        <a href="#/timesheet" class="btn btn-primary tile-btn">Doplnit a uložit</a>
      </div>`;
    return;
  }

  const running = !!t?.running;
  const paused = !!t && !t.running;

  el.innerHTML = `
    <div class="tile-clock${running ? ' tr-running' : ''}">${formatDuration(elapsedMs(t))}</div>
    <div class="tile-tracker-state muted">${running ? 'měří se' : (paused ? 'pozastaveno' : 'stopky stojí')}</div>
    <div class="tile-tracker-buttons">
      ${!t ? `<button class="btn btn-primary tile-btn" data-act="start">Spustit</button>` : ''}
      ${running ? `<button class="btn tile-btn" data-act="pause">Pauza</button>` : ''}
      ${paused ? `<button class="btn btn-primary tile-btn" data-act="resume">Pokračovat</button>` : ''}
      ${t ? `<button class="btn tile-btn" data-act="stop">Stop</button>` : ''}
    </div>`;

  if (running) {
    const clock = el.querySelector('.tile-clock');
    const timer = setInterval(() => {
      // Až dlaždice zmizí ze stránky, interval se uklidí sám.
      if (!document.contains(clock)) { clearInterval(timer); return; }
      clock.textContent = formatDuration(elapsedMs(readTracker()));
    }, 1000);
  }

  el.querySelector('.tile-tracker-buttons').addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'start') startTracker();
    else if (act === 'pause') pauseTracker();
    else if (act === 'resume') resumeTracker();
    else if (act === 'stop') {
      // Stop znamená „mám hotovo" — projekt a popis se doplní v modulu.
      stopTracker();
      location.hash = '#/timesheet';
      return;
    }
    renderTile(el);
  });
}

/**
 * Můj výkaz. Když čeká naměřený čas z trackeru, řeší se nejdřív — proto je
 * panel nad výpisem, ne někde bokem.
 */
async function renderMine(view, email) {
  view.innerHTML = `<div id="ts-pending"></div><div id="ts-mine"></div>`;

  const t = readTracker();
  if (t?.stopped) {
    await renderPending(view.querySelector('#ts-pending'), email, t, () => renderMine(view, email));
  }
  renderList(view.querySelector('#ts-mine'), email);
}

/** Zastavené stopky — naměřený čas čeká, až z něj uděláš výkaz. */
async function renderPending(view, email, t, onDone) {
  const projects = await projectsFor(email, { level: 'report' });
  if (!projects.length) {
    view.innerHTML = `<div class="error">
      Máš naměřeno ${esc(formatDuration(elapsedMs(t)))}, ale nemáš přiřazený žádný projekt,
      do kterého bys mohl vykazovat. Napiš <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a> —
      <strong>naměřený čas zůstane uložený</strong>, dokud ho nezahodíš.
    </div>`;
    return;
  }

  const ms = elapsedMs(t);
  const hours = toHours(ms);
  const day = trackedDay(t);

  view.innerHTML = `
    <div class="tr-pending">
      <div class="tr-pending-head">
        <span class="tr-clock">${formatDuration(ms)}</span>
        <span class="tr-state muted">naměřeno trackerem · uloží se jako ${esc(fmtHours(hours))} h</span>
      </div>
    <div class="ts-form tr-form">
      <label class="ts-field-wide">Projekt
        <select id="tr-project">${projectOptions(projects, projects[0].id)}</select>
      </label>
      <label>Typ práce
        <select id="tr-kind">${kindOptions(kindForRole(projects[0].role))}</select>
      </label>
      <label class="ts-field-wide">Popis
        <textarea class="input ts-note" id="tr-note" rows="3" placeholder="Co se dělalo…"></textarea>
      </label>
    </div>
    <div class="form-actions">
      <button id="tr-discard" class="btn btn-danger">Zahodit naměřený čas</button>
      <span class="form-actions-gap"></span>
      <span id="tr-msg" class="form-msg"></span>
      <button id="tr-save" class="btn btn-primary">Uložit výkaz</button>
    </div>
    <p class="note">Zapíše se na ${esc(formatDate(day))} — den, kdy měření začalo.</p>
    </div>`;

  const projectSelect = view.querySelector('#tr-project');
  const kindSelect = view.querySelector('#tr-kind');
  const msg = view.querySelector('#tr-msg');

  projectSelect.addEventListener('change', () => {
    const picked = projects.find((p) => p.id === projectSelect.value);
    kindSelect.value = kindForRole(picked?.role);
  });

  const ulozit = async () => {
    if (hours <= 0) {
      flash(msg, 'Naměřený čas je moc krátký na zápis.', 'error');
      return;
    }

    const entry = await addEntry({
      projectId: projectSelect.value,
      email,
      date: day,
      hours,
      kind: kindSelect.value,
      note: view.querySelector('#tr-note').value.trim(),
    });

    if (!entry) {
      flash(msg, 'Uložení se nepovedlo.', 'error');
      return;
    }

    clearTracker();
    onDone();
  };

  wireKeys(view, { submit: ulozit });
  view.querySelector('#tr-save').addEventListener('click', ulozit);

  view.querySelector('#tr-discard').addEventListener('click', () => {
    if (!confirm(`Zahodit naměřených ${formatDuration(ms)}?`)) return;
    clearTracker();
    onDone();
  });
}

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
      Napiš <a href="mailto:${esc(CONTACT)}">${esc(CONTACT)}</a>, ať tě na projekt přidá.
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
    <div class="form-actions">
      <span class="form-actions-gap"></span>
      <span id="ts-msg" class="form-msg"></span>
      <button id="ts-save" class="btn btn-primary">Uložit výkaz</button>
    </div>
    <h2 class="section-head">Zapsáno k tomuhle dni</h2>
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

  const ulozit = async () => {
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
      flash(msg, 'Vyplň datum a hodiny (víc než nula).', 'error');
      return;
    }

    // Projekt a datum necháváme — obvykle se zapisuje víc věcí za sebou.
    hoursInput.value = '';
    noteInput.value = '';
    flash(msg, 'Uloženo.');
    hoursInput.focus();
    loadDay(view, email, dateInput.value);
  };

  wireKeys(view, { submit: ulozit });
  view.querySelector('#ts-save').addEventListener('click', ulozit);

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

export const RANGES = [
  { id: 'month', label: 'Tento měsíc' },
  { id: 'lastmonth', label: 'Minulý měsíc' },
  { id: 'year', label: 'Tento rok' },
  { id: 'all', label: 'Vše' },
];

export const DEFAULT_RANGE = 'month';

/** Hranice [od, do) jako 'YYYY-MM-DD'; null = neomezeno. */
export function rangeBounds(id) {
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

export function inRange(date, [from, to]) {
  return (from === null || date >= from) && (to === null || date < to);
}

function renderList(view, email) {
  view.innerHTML = `
    <div class="filter-bar">
      ${RANGES.map((r) =>
        `<button class="btn filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
      ).join('')}
    </div>
    <div id="ts-list"><div class="loading">Načítám…</div></div>`;

  view.querySelector('.filter-bar').addEventListener('click', (e) => {
    const range = e.target.dataset.range;
    if (!range) return;
    view.querySelectorAll('.filter').forEach((b) => b.classList.toggle('active', b === e.target));
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
              <button class="btn" data-act="cancel">Zrušit</button>
              <button class="btn btn-primary" data-act="save">Uložit změny</button>
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
    <div class="table-scroll"><table class="table ts-table">
      <thead>
        <tr><th>Datum</th><th>Projekt</th><th>Typ</th><th class="ts-num">Hodiny</th><th>Popis</th><th></th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;

  const ulozitRadek = async (row) => {
    const get = (field) => row.querySelector(`[data-field="${field}"]`).value;
    await updateEntry(row.dataset.id, {
      date: get('date'),
      project_id: get('project_id'),
      hours: get('hours'),
      kind: get('kind'),
      note: get('note').trim(),
    });
    loadList(view, email, range);
  };

  // Klávesy se navěšují na editovaný řádek, ne na celou tabulku — Enter
  // v jiném řádku nemá co ukládat.
  const editing = el.querySelector('tr.ts-editing');
  if (editing) {
    wireKeys(editing, {
      submit: () => ulozitRadek(editing),
      cancel: () => loadList(view, email, range),
    });
  }

  el.onclick = async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    const row = e.target.closest('tr');

    if (act === 'edit') { loadList(view, email, range, row.dataset.id); return; }
    if (act === 'cancel') { loadList(view, email, range); return; }
    if (act === 'save') { await ulozitRadek(row); return; }

    if (!confirm('Smazat tenhle výkaz?')) return;
    await deleteEntry(row.dataset.id);
    loadList(view, email, range);
  };
}
