import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

const OPEN_STATUSES = ['open'];

export async function renderProjectDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    // First get the project
    const { data: project, error } = await sb.from('projects').select('*').eq('id', id).single();

    if (error || !project) {
      container.innerHTML = '<div class="error">Project not found. <a href="#/projects">Back to list</a></div>';
      return;
    }

    // Get contact if project has contact_id
    let contact = null;
    if (project.contact_id) {
      const { data: c } = await sb.from('contacts').select('id, first_name, last_name, email').eq('id', project.contact_id).single();
      contact = c;
    }

    // Get company if project has company_id
    let company = null;
    if (project.company_id) {
      const { data: c } = await sb.from('companies').select('id, name').eq('id', project.company_id).single();
      company = c;
    }

    const isOpenStatus = OPEN_STATUSES.includes(project.status);
    const isFrozen = project.status === 'frozen';

    // Build compact metadata line
    const metaParts = [];
    if (project.amount) metaParts.push(`${Math.round(parseFloat(project.amount) / 1000)}k Kc`);
    metaParts.push(`<span class="status-badge status-${project.status}">${getStatusLabel(project.status)}</span>`);
    if (project.expected_close) metaParts.push(`Exp: ${new Date(project.expected_close).toLocaleDateString('cs-CZ')}`);
    if (contact) metaParts.push(`Contact: <a href="#/contacts/${contact.id}">${esc(contact.first_name)} ${esc(contact.last_name)}</a>`);
    if (company) metaParts.push(`Company: <a href="#/companies/${company.id}">${esc(company.name)}</a>`);
    metaParts.push(`Upd: ${timeAgo(project.updated_at)}`);
    metaParts.push(`Add: ${timeAgo(project.created_at)}`);

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/projects" class="btn btn-back">&larr; Back</a>
            <h1>${esc(project.title)}</h1>
            <div class="detail-actions">
              ${isOpenStatus ? `<button id="freeze-project" class="btn btn-freeze">Freeze</button>` : ''}
              ${isFrozen ? `<button id="unfreeze-project" class="btn btn-success">Unfreeze</button>` : ''}
              <button id="edit-project" class="btn btn-secondary">Edit</button>
              <button id="delete-project" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="compact-meta">${metaParts.join(' · ')}</div>

        <div class="detail-grid">
          <div class="detail-main">
            <div class="card">
              <div class="section-bar">Notes</div>
              <div class="notes-toolbar">
                <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
                <span id="notes-status"></span>
                <button id="save-notes-btn" class="btn btn-sm btn-primary">Save</button>
              </div>
              <textarea id="project-notes" class="input notes-textarea" rows="10">${esc(project.notes || '')}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;

    // Save notes
    container.querySelector('#save-notes-btn').addEventListener('click', async () => {
      const notes = container.querySelector('#project-notes').value;
      const status = container.querySelector('#notes-status');
      const { error: updErr } = await sb.from('projects').update({ notes: notes || null }).eq('id', id);
      if (updErr) {
        status.textContent = 'Error: ' + updErr.message;
        status.style.color = 'var(--danger, red)';
      } else {
        status.textContent = 'Saved';
        status.style.color = 'var(--success, green)';
        setTimeout(() => { status.textContent = ''; }, 2000);
      }
    });

    // Add timestamp
    container.querySelector('#add-timestamp-btn').addEventListener('click', () => {
      const textarea = container.querySelector('#project-notes');
      const date = new Date().toLocaleDateString('cs-CZ');
      const pos = textarea.selectionStart;
      const val = textarea.value;
      const stamp = `\n[${date}] `;
      textarea.value = val.slice(0, pos) + stamp + val.slice(pos);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = pos + stamp.length;
    });

    // Freeze project
    const freezeBtn = container.querySelector('#freeze-project');
    if (freezeBtn) {
      freezeBtn.addEventListener('click', async () => {
        const { error } = await sb.from('projects')
          .update({ status: 'frozen' })
          .eq('id', id);
        if (error) { alert('Error: ' + error.message); return; }
        await renderProjectDetail(container, id);
      });
    }

    // Unfreeze project
    const unfreezeBtn = container.querySelector('#unfreeze-project');
    if (unfreezeBtn) {
      unfreezeBtn.addEventListener('click', async () => {
        const { error } = await sb.from('projects')
          .update({ status: 'open' })
          .eq('id', id);
        if (error) { alert('Error: ' + error.message); return; }
        await renderProjectDetail(container, id);
      });
    }

    // Edit project
    container.querySelector('#edit-project').addEventListener('click', () => {
      window.location.hash = `#/projects/${id}/edit`;
    });

    // Delete project
    container.querySelector('#delete-project').addEventListener('click', async () => {
      await deleteWithUndo('projects', project, `"${project.title}"`,
        () => { window.location.hash = '#/projects'; },
        () => { window.location.hash = `#/projects/${id}`; }
      );
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function getStatusLabel(status) {
  const labels = {
    'open': 'Open',
    'frozen': 'Frozen',
    'won': 'Won',
    'lost': 'Lost'
  };
  return labels[status] || status;
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
