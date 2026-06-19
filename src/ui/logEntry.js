import { sb } from '../supabase.js';
import { deleteWithUndo } from '../utils/undo.js';

/**
 * Render a chronological log timeline with edit/delete actions.
 * @param {Array} logs
 * @param {'contact'|'project'} context
 * @param {Object} options - { contacts: [], projects: [] } for edit dropdowns
 */
export function renderLogTimeline(logs, context = 'contact', options = {}) {
  if (!logs || logs.length === 0) {
    return '<div class="log-empty">No log entries yet.</div>';
  }

  return `<div class="log-timeline">${logs.map(log => {
    const date = formatLogDate(log.logged_at);
    let tag = '';
    if (context === 'contact' && log.projects?.title) {
      tag = ` <a href="#/projects/${log.project_id}" class="log-tag">[${esc(log.projects.title)}]</a>`;
    } else if (context === 'project' && log.contacts) {
      const name = `${log.contacts.first_name || ''} ${log.contacts.last_name || ''}`.trim();
      if (name) tag = ` <a href="#/contacts/${log.contact_id}" class="log-tag">[${esc(name)}]</a>`;
    }

    const isNext = log.content?.startsWith('>');
    return `
      <div class="log-entry${isNext ? ' log-entry-next' : ''}" data-log-id="${log.id}">
        <div class="log-entry-view">
          <span class="log-date">${date} ───</span>
          <span class="log-content">${esc(log.content)}</span>${tag}
          <span class="log-actions">
            <button class="log-edit-btn" data-log-id="${log.id}" title="Edit">edit</button>
            <button class="log-delete-btn" data-log-id="${log.id}" title="Delete">&times;</button>
          </span>
        </div>
        <div class="log-entry-edit" style="display:none" data-log-id="${log.id}">
          <input type="date" class="input log-edit-date" value="${log.logged_at || ''}">
          <textarea class="input log-edit-content" rows="2">${esc(log.content || '')}</textarea>
          <div class="log-edit-row">
            ${context === 'contact' ? `
              <select class="input log-edit-project">
                <option value="">-- project --</option>
                ${(options.projects || []).map(p => `<option value="${p.id}"${log.project_id === p.id ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}
              </select>` : ''}
            ${context === 'project' ? `
              <select class="input log-edit-contact">
                <option value="">-- contact --</option>
                ${(options.contacts || []).map(c => `<option value="${c.id}"${log.contact_id === c.id ? ' selected' : ''}>${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
              </select>` : ''}
            <button class="btn btn-sm btn-primary log-edit-save" data-log-id="${log.id}">Save</button>
            <button class="btn btn-sm btn-secondary log-edit-cancel" data-log-id="${log.id}">Cancel</button>
          </div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

/**
 * Attach edit, delete listeners to log timeline.
 */
export function attachLogListeners(container, onRefresh) {
  // Edit toggle
  container.querySelectorAll('.log-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.logId;
      const entry = container.querySelector(`.log-entry[data-log-id="${id}"]`);
      if (!entry) return;
      entry.querySelector('.log-entry-view').style.display = 'none';
      entry.querySelector('.log-entry-edit').style.display = '';
    });
  });

  // Edit cancel
  container.querySelectorAll('.log-edit-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.logId;
      const entry = container.querySelector(`.log-entry[data-log-id="${id}"]`);
      if (!entry) return;
      entry.querySelector('.log-entry-view').style.display = '';
      entry.querySelector('.log-entry-edit').style.display = 'none';
    });
  });

  // Edit save
  container.querySelectorAll('.log-edit-save').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.logId;
      const entry = container.querySelector(`.log-entry[data-log-id="${id}"]`);
      if (!entry) return;
      const editDiv = entry.querySelector('.log-entry-edit');

      const content = editDiv.querySelector('.log-edit-content').value.trim();
      if (!content) return;

      const logged_at = editDiv.querySelector('.log-edit-date').value;
      const projectSel = editDiv.querySelector('.log-edit-project');
      const contactSel = editDiv.querySelector('.log-edit-contact');

      const update = { content, logged_at: logged_at || null };
      if (projectSel) update.project_id = projectSel.value || null;
      if (contactSel) update.contact_id = contactSel.value || null;

      const { error } = await sb.from('logs').update(update).eq('id', id);
      if (!error && onRefresh) onRefresh();
    });
  });

  // Delete with undo
  container.querySelectorAll('.log-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const logId = btn.dataset.logId;
      if (!logId) return;
      await deleteWithUndo('logs', { id: logId }, 'log entry',
        () => { if (onRefresh) onRefresh(); },
        () => { if (onRefresh) onRefresh(); }
      );
    });
  });
}

function formatLogDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.`;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
