// Přístupy do projektů — kdo který projekt vidí a kam smí vykazovat.
// Modul do Nastavení, vedle Přístupů a Hodinových sazeb.
//
// Matice lidé × projekty; buňka má tři stavy: — / vidí / vykazuje.
// Projekty se tady nezakládají ani neupravují — to patří do modulu Projekty.
// Přiřazovat jde jen do aktivních; archivovaný projekt ve sloupcích není.

import { esc } from '../../util.js';
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
        <div class="page-head"><h1>Přístupy do projektů</h1></div>
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
    el.innerHTML = `<div class="empty-state">Zatím se nikdo nepřihlásil.</div>`;
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
        <select data-project="${esc(p.id)}">
          ${opt('', '—')}${opt('view', LEVEL_LABEL.view)}${opt('report', LEVEL_LABEL.report)}
        </select>
      </td>`;
    }).join('');

    return `<tr data-email="${esc(u.email)}"><td class="pacc-email">${esc(u.email)}</td>${cells}</tr>`;
  }).join('');

  el.innerHTML = `
    <table class="table pacc-table">
      <thead><tr><th>Člověk</th>${heads}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  if (!canEdit) return;

  // Ukládá se hned při přepnutí, bez tlačítka — stejně jako v Přístupech.
  el.onchange = async (e) => {
    const projectId = e.target.dataset.project;
    if (!projectId) return;
    const email = e.target.closest('tr').dataset.email;
    await setMember(projectId, email, e.target.value || null);
  };
}
