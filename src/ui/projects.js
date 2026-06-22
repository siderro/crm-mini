import { sb } from '../supabase.js';
import { deleteWithUndo } from '../utils/undo.js';
import { getTemperature } from '../utils/temperature.js';

// Define status groups and labels
const OPEN_STATUSES = ['open'];
const STATUS_LABELS = {
  'open': 'Open',
  'frozen': 'Frozen',
  'won': 'Won',
  'lost': 'Lost'
};

const STATUS_GROUPS = [
  { key: 'open', title: 'Open', statuses: ['open'] },
  { key: 'frozen', title: 'Frozen', statuses: ['frozen'] },
  { key: 'won', title: 'Won', statuses: ['won'] },
  { key: 'lost', title: 'Lost', statuses: ['lost'] }
];

export async function renderProjects(container) {
  container.innerHTML = '<div class="loading">Loading projects...</div>';

  try {
    const [
      { data: projects, error },
      { data: contacts },
      { data: companies },
      { data: logRows },
    ] = await Promise.all([
      sb.from('projects').select('*, contacts(first_name, last_name), companies(name)').order('updated_at', { ascending: false }),
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('companies').select('id, name').order('name'),
      sb.from('logs').select('project_id, logged_at, content').not('project_id', 'is', null).order('logged_at', { ascending: false }),
    ]);

    if (error) throw error;

    // Build project_id → { date, content } map
    const lastLogMap = new Map();
    for (const row of (logRows || [])) {
      if (row.project_id && !lastLogMap.has(row.project_id)) {
        lastLogMap.set(row.project_id, { date: row.logged_at, content: row.content });
      }
    }

    const list = projects || [];
    const contactsList = contacts || [];
    const companiesList = companies || [];

    // Calculate stats
    const totalValue = list.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const frozenProjects = list.filter(d => d.status === 'frozen');
    const frozenValue = frozenProjects.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    // Group projects by status
    const groupedProjects = groupProjectsByStatus(list);

    container.innerHTML = `
      <div class="page-header">
        <h1>Projects <span class="badge">${list.length}</span> <span class="header-meta">Total ${totalValue.toLocaleString('cs-CZ')} Kc / Frozen ${frozenValue.toLocaleString('cs-CZ')} Kc</span></h1>
        <div class="header-actions">
          <button id="add-project-btn" class="btn btn-primary">+ New Project</button>
        </div>
      </div>

      <div id="project-form-wrap" class="card form-card" style="display:none">
        <h2 id="project-form-title">New Project</h2>
        <form id="project-form">
          <input type="hidden" id="project-edit-id" value="">
          <div class="form-group">
            <label for="d-title">Title *</label>
            <input type="text" id="d-title" class="input" required>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="project-submit-btn">Save</button>
            <button type="button" id="project-cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
          <div class="form-error" id="project-form-error"></div>
        </form>
      </div>

      ${renderGroupedProjects(groupedProjects, list, lastLogMap)}
    `;

    const formWrap = container.querySelector('#project-form-wrap');
    const form = container.querySelector('#project-form');

    function showForm() {
      formWrap.style.display = '';
      container.querySelector('#d-title').value = '';
      container.querySelector('#d-title').focus();
    }

    function hideForm() {
      formWrap.style.display = 'none';
      form.reset();
      container.querySelector('#project-form-error').textContent = '';
    }

    container.querySelector('#add-project-btn').addEventListener('click', () => showForm());
    container.querySelector('#project-cancel-btn').addEventListener('click', hideForm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#d-title').value.trim();
      if (!title) { container.querySelector('#project-form-error').textContent = 'Title is required'; return; }

      try {
        const user = (await sb.auth.getUser()).data.user;
        const { data, error } = await sb.from('projects')
          .insert({ title, status: 'open', user_id: user.id })
          .select().single();
        if (error) throw error;
        window.location.hash = `#/projects/${data.id}`;
      } catch (err) {
        container.querySelector('#project-form-error').textContent = 'Error: ' + err.message;
      }
    });

    // Delete links
    container.querySelectorAll('.delete-project').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const d = list.find(x => x.id === btn.dataset.id);
        if (!d) return;
        await deleteWithUndo('projects', d, `"${d.title}"`,
          () => renderProjects(container),
          () => renderProjects(container)
        );
      });
    });

    // Freeze links
    container.querySelectorAll('.freeze-project').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const projectId = btn.dataset.id;
        const currentStatus = btn.dataset.status;
        const { error } = await sb.from('projects')
          .update({ status: 'frozen', previous_status: currentStatus })
          .eq('id', projectId);
        if (error) { alert('Error: ' + error.message); return; }
        await renderProjects(container);
      });
    });

    // Unfreeze links
    container.querySelectorAll('.unfreeze-project').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const projectId = btn.dataset.id;
        const previousStatus = 'open';
        const { error } = await sb.from('projects')
          .update({ status: previousStatus, previous_status: null })
          .eq('id', projectId);
        if (error) { alert('Error: ' + error.message); return; }
        await renderProjects(container);
      });
    });

    // Click on project rows
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.hash = `#/projects/${row.dataset.id}`;
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function groupProjectsByStatus(projects) {
  const grouped = {};
  STATUS_GROUPS.forEach(group => {
    const groupProjects = projects.filter(d => group.statuses.includes(d.status));
    // Sort by updated_at desc, created_at desc, title asc
    groupProjects.sort((a, b) => {
      if (a.updated_at !== b.updated_at) return new Date(b.updated_at) - new Date(a.updated_at);
      if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      return (a.title || '').localeCompare(b.title || '');
    });
    grouped[group.key] = { ...group, projects: groupProjects };
  });
  return grouped;
}

function renderGroupedProjects(groupedProjects, allProjects, lastLogMap) {
  return Object.values(groupedProjects).map(group => {
    if (group.projects.length === 0) return '';

    return `
      <div class="project-group">
        <h2 class="group-heading">${group.title} <span class="badge">${group.projects.length}</span></h2>
        <div class="table-wrap">
          <table class="data-table table-projects">
            <thead>
              <tr>
                <th>Project</th>
                <th>Value</th>
                <th>Contact</th>
                <th>Temp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${group.projects.map(d => renderProjectRow(d, lastLogMap)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function renderProjectRow(d, lastLogMap) {
  const amountNum = parseFloat(d.amount) || 0;
  const amount = amountNum ? `${Math.round(amountNum / 1000)}K` : '-';
  const logInfo = lastLogMap.get(d.id);
  const temp = getTemperature(logInfo?.date);
  const snippet = logInfo?.content ? truncate(logInfo.content, 80) : '';

  const isOpenStatus = OPEN_STATUSES.includes(d.status);
  const isFrozen = d.status === 'frozen';

  const contactName = d.contacts
    ? `${esc(d.contacts.first_name)} ${esc(d.contacts.last_name)}`
    : '<span class="muted">-</span>';

  return `
    <tr class="clickable-row ${temp.css}" data-id="${d.id}">
      <td>
        <strong>${esc(d.title)}</strong>
        ${snippet ? `<div class="log-snippet">${esc(snippet)}</div>` : ''}
      </td>
      <td>${amount}</td>
      <td>${contactName}</td>
      <td class="${temp.css}">${temp.label}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        ${isOpenStatus ? `<a href="#" class="freeze-project" data-id="${d.id}" data-status="${d.status}">Freeze</a>` : ''}
        ${isFrozen ? `<a href="#" class="unfreeze-project" data-id="${d.id}">Unfreeze</a>` : ''}
        <a href="#" class="danger-link delete-project" data-id="${d.id}" data-title="${escapeAttr(d.title)}">Delete</a>
      </td>
    </tr>
  `;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

