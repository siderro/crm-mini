// Přístupy do projektů — kdo který projekt vidí a kam smí vykazovat.
// Modul do Nastavení, vedle Přístupů a Hodinových sazeb.
//
// Matice lidé × projekty; buňka má tři stavy: — / vidí / vykazuje.
// Projekty se tady nezakládají ani neupravují — to patří do modulu Projekty.
// Přiřazovat jde jen do aktivních; archivovaný projekt ve sloupcích není.

import { esc, flash } from '../../util.js';
import { listUsers } from '../access/store.js';
import { getProjects, getMembers, setMember, LEVEL_LABEL } from './store.js';

export const projectAccess = {
  id: 'project-access',
  label: 'Přístupy do projektů',
  desc: 'Kdo který projekt vidí a kam vykazuje',
  levels: true,          // v Přístupech se nastavuje čtení / editace
  settings: true,        // nepatří do hlavní navigace, žije v Nastavení
  render(mount, subPath = [], ctx = {}) {
    mount.innerHTML = `
      <div class="pacc">
        <div class="page-head">
          <h1>Přístupy do projektů</h1>
          <span class="form-msg" id="pacc-msg"></span>
        </div>
        <p class="lead">
          <strong>vidí</strong> = uvidí projekt v přehledu.
          <strong>vykazuje</strong> = smí do něj zapisovat čas.
          Ukládá se hned při přepnutí.
        </p>
        <div id="pacc-matrix"><div class="loading">Načítám…</div></div>
      </div>`;

    renderMatrix(mount.querySelector('#pacc-matrix'), !!ctx.canEdit);
  },
};

async function renderMatrix(el, canEdit) {
  let users, projects, members;
  try {
    [users, projects, members] = await Promise.all([listUsers(), getProjects(), getMembers()]);
  } catch (err) {
    el.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!users.length) {
    el.innerHTML = `<div class="empty-state">Kromě tebe se zatím nikdo nepřihlásil. Přístup dostane, až se poprvé přihlásí přes Google.</div>`;
    return;
  }
  if (!projects.length) {
    el.innerHTML = `<div class="empty-state">
      Žádné aktivní projekty. Založ je v modulu <a href="#/pm">Projekty</a>.
    </div>`;
    return;
  }

  const heads = projects.map((p) => `<th class="pacc-cell">${esc(p.name)}</th>`).join('');

  const rows = users.map((u) => {
    const mine = members[u.email] || {};
    const cells = projects.map((p) => {
      const level = mine[p.id] || '';
      if (!canEdit) {
        return `<td class="pacc-cell">${level
          ? `<span class="status status-${level === 'report' ? 'open' : 'frozen'}">${esc(LEVEL_LABEL[level])}</span>`
          : '<span class="muted">—</span>'}</td>`;
      }
      const opt = (value, label) =>
        `<option value="${value}"${level === value ? ' selected' : ''}>${label}</option>`;
      return `<td class="pacc-cell">
        <select data-project="${esc(p.id)}" data-saved="${esc(level)}">
          ${opt('', '—')}${opt('view', LEVEL_LABEL.view)}${opt('report', LEVEL_LABEL.report)}
        </select>
      </td>`;
    }).join('');

    return `<tr data-email="${esc(u.email)}"><td class="pacc-email">${esc(u.email)}</td>${cells}</tr>`;
  }).join('');

  el.innerHTML = `
    <div class="table-scroll"><table class="table pacc-table">
      <thead><tr><th>Člověk</th>${heads}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  if (!canEdit) return;

  // Jedna hodnota → ukládá se hned při přepnutí, bez tlačítka. Musí se ale
  // ozvat: nic se tu nepřekresluje, takže bez hlášky nejde poznat, jestli
  // zápis prošel — a chyba by spadla jen do globální lišty.
  const msg = document.querySelector('#pacc-msg');

  el.onchange = async (e) => {
    const projectId = e.target.dataset.project;
    if (!projectId) return;

    const row = e.target.closest('tr');
    const email = row.dataset.email;
    const level = e.target.value || null;
    const puvodni = e.target.dataset.saved ?? '';

    try {
      await setMember(projectId, email, level);
      e.target.dataset.saved = level || '';
      flash(msg, `Uloženo — ${shortName(email)}: ${level ? LEVEL_LABEL[level] : 'bez přístupu'}`);
    } catch (err) {
      e.target.value = puvodni;   // neuložilo se, tak ať to políčko netvrdí opak
      flash(msg, `Chyba: ${err.message}`, 'error');
    }
  };
}

/** Jméno z e-mailu do krátké hlášky. */
function shortName(email) {
  return String(email).split('@')[0];
}
