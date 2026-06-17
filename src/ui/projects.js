import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

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
    const { data: projects, error } = await sb.from('projects')
      .select('*, contacts(first_name, last_name), companies(name)')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const { data: contacts } = await sb.from('contacts').select('id, first_name, last_name').order('last_name');
    const { data: companies } = await sb.from('companies').select('id, name').order('name');

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
          <div class="form-row">
            <div class="form-group">
              <label for="d-title">Project Title *</label>
              <input type="text" id="d-title" class="input" required>
            </div>
            <div class="form-group">
              <label for="d-amount">Amount</label>
              <input type="number" id="d-amount" class="input" step="0.01" placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="d-status">Status *</label>
              <select id="d-status" class="input" required>
                <option value="open">Open</option>
                <option value="frozen">Frozen</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div class="form-group">
              <label for="d-expected">Expected Close</label>
              <input type="date" id="d-expected" class="input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="d-contact">Contact</label>
              <select id="d-contact" class="input">
                <option value="">-- None --</option>
                ${contactsList.map(c => `<option value="${c.id}">${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="d-company">Company</label>
              <select id="d-company" class="input">
                <option value="">-- None --</option>
                ${companiesList.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="d-notes">Notes</label>
            <textarea id="d-notes" class="input" rows="3"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="project-submit-btn">Create Project</button>
            <button type="button" id="project-cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
          <div class="form-error" id="project-form-error"></div>
        </form>
      </div>

      ${renderGroupedProjects(groupedProjects, list)}
    `;

    const formWrap = container.querySelector('#project-form-wrap');
    const form = container.querySelector('#project-form');

    function showForm(project = null) {
      formWrap.style.display = '';
      container.querySelector('#project-form-title').textContent = project ? 'Edit Project' : 'New Project';
      container.querySelector('#project-submit-btn').textContent = project ? 'Save Changes' : 'Create Project';
      container.querySelector('#project-edit-id').value = project?.id || '';
      container.querySelector('#d-title').value = project?.title || '';
      container.querySelector('#d-amount').value = project?.amount || '';
      container.querySelector('#d-status').value = project?.status || 'open';
      container.querySelector('#d-expected').value = project?.expected_close || '';
      container.querySelector('#d-contact').value = project?.contact_id || '';
      container.querySelector('#d-company').value = project?.company_id || '';
      container.querySelector('#d-notes').value = project?.notes || '';
      container.querySelector('#d-title').focus();
    }

    function hideForm() {
      formWrap.style.display = 'none';
      form.reset();
      container.querySelector('#project-edit-id').value = '';
      container.querySelector('#project-form-error').textContent = '';
    }

    container.querySelector('#add-project-btn').addEventListener('click', () => showForm());
    container.querySelector('#project-cancel-btn').addEventListener('click', hideForm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#d-title').value.trim();
      if (!title) { container.querySelector('#project-form-error').textContent = 'Project title is required'; return; }

      const editId = container.querySelector('#project-edit-id').value;
      const payload = {
        title,
        amount: container.querySelector('#d-amount').value || null,
        status: container.querySelector('#d-status').value,
        expected_close: container.querySelector('#d-expected').value || null,
        contact_id: container.querySelector('#d-contact').value || null,
        company_id: container.querySelector('#d-company').value || null,
        notes: container.querySelector('#d-notes').value.trim() || null,
      };

      try {
        if (editId) {
          const { error } = await sb.from('projects').update(payload).eq('id', editId);
          if (error) throw error;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { error } = await sb.from('projects').insert(payload);
          if (error) throw error;
        }
        await renderProjects(container);
      } catch (err) {
        container.querySelector('#project-form-error').textContent = 'Error: ' + err.message;
      }
    });

    // Edit links
    container.querySelectorAll('.edit-project').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const d = list.find(x => x.id === btn.dataset.id);
        if (d) showForm(d);
      });
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

function renderGroupedProjects(groupedProjects, allProjects) {
  const maxValue = Math.max(...allProjects.map(d => parseFloat(d.amount) || 0), 1);

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
                <th>Status</th>
                <th>Value</th>
                <th>Created/Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${group.projects.map(d => renderProjectRow(d, maxValue)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function renderProjectRow(d, maxValue) {
  const createdDays = getDaysAgo(d.created_at);
  const modifiedDays = getDaysAgo(d.updated_at);
  const amountNum = parseFloat(d.amount) || 0;
  const amount = amountNum.toLocaleString('cs-CZ', {minimumFractionDigits: 0, maximumFractionDigits: 0});
  const valuePct = maxValue > 0 ? (amountNum / maxValue) * 100 : 0;

  const isOpenStatus = OPEN_STATUSES.includes(d.status);
  const isFrozen = d.status === 'frozen';

  const statusLabel = STATUS_LABELS[d.status] || d.status;
  const progressBar = renderTextProgressBar(valuePct);

  return `
    <tr class="clickable-row" data-id="${d.id}">
      <td><strong>${esc(d.title)}</strong></td>
      <td>${statusLabel}</td>
      <td><span class="text-progress-bar">${progressBar}</span> ${amount} Kc</td>
      <td>(${createdDays}d / ${modifiedDays}d)</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        ${isOpenStatus ? `<a href="#" class="freeze-project" data-id="${d.id}" data-status="${d.status}">Freeze</a>` : ''}
        ${isFrozen ? `<a href="#" class="unfreeze-project" data-id="${d.id}">Unfreeze</a>` : ''}
        <a href="#" class="danger-link delete-project" data-id="${d.id}" data-title="${escapeAttr(d.title)}">Delete</a>
      </td>
    </tr>
  `;
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

function getDaysAgo(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function renderTextProgressBar(percentage) {
  const pct = Math.round(percentage);
  const totalBlocks = 10;
  const filledBlocks = Math.round((pct / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;

  const filled = '\u2588'.repeat(filledBlocks);
  const empty = '\u2591'.repeat(emptyBlocks);

  return `${filled}${empty}`;
}
