import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';
import { renderLogTimeline, attachLogListeners } from './logEntry.js';
import { debounce } from '../utils/debounce.js';

const STATUS_OPTIONS = ['open', 'frozen', 'won', 'lost'];

export async function renderProjectDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: project, error },
      { data: logs },
      { data: contacts },
      { data: companies },
    ] = await Promise.all([
      sb.from('projects').select('*').eq('id', id).single(),
      sb.from('logs').select('*, contacts(first_name, last_name)').eq('project_id', id).order('logged_at', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('companies').select('id, name').order('name'),
    ]);

    if (error || !project) {
      container.innerHTML = '<div class="error">Project not found. <a href="#/projects">Back to list</a></div>';
      return;
    }

    // Next step / waiting — based on most recent log prefix
    const firstLog = (logs || [])[0];
    const nextStepHtml = firstLog?.content?.startsWith('>')
      ? `<div class="next-step"><span class="next-step-label">NEXT:</span> ${esc(firstLog.content.slice(1).trim())} <span class="muted">${formatDate(firstLog.logged_at)}</span></div>`
      : firstLog?.content?.startsWith('?')
      ? `<div class="next-step waiting-step"><span class="waiting-step-label">WAITING:</span> ${esc(firstLog.content.slice(1).trim())} <span class="muted">${formatDate(firstLog.logged_at)}</span></div>`
      : '';

    const logTimelineHtml = renderLogTimeline(logs || [], 'project', { contacts: contacts || [] });

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/projects" class="btn btn-back">&larr; Back</a>
            <h1>${esc(project.title)}</h1>
            <div class="detail-actions">
              <button id="delete-project" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        ${nextStepHtml}

        <div class="inline-fields-vertical">
          <label>Amount <input type="number" id="f-amount" class="input inline-input" value="${project.amount || ''}" placeholder="—" step="1"></label>
          <label>Status
            <select id="f-status" class="input inline-input">
              ${STATUS_OPTIONS.map(s => `<option value="${s}"${project.status === s ? ' selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </label>
          <label>Expected close <input type="date" id="f-expected" class="input inline-input" value="${project.expected_close || ''}">${project.expected_close && project.expected_close < new Date().toISOString().slice(0, 10) ? ` <strong class="overdue-label">OVERDUE</strong>` : ''}</label>
          <label>Contact
            <select id="f-contact" class="input inline-input">
              <option value="">—</option>
              ${(contacts || []).map(c => `<option value="${c.id}"${project.contact_id === c.id ? ' selected' : ''}>${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
            </select>
          </label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(companies || []).map(c => `<option value="${c.id}"${project.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        <div class="section-bar">Log</div>
        ${logTimelineHtml}
      </div>
    `;

    // Autosave
    const statusEl = container.querySelector('#inline-status');

    async function saveField(field, value) {
      const { error } = await sb.from('projects').update({ [field]: value || null }).eq('id', id);
      if (error) {
        statusEl.textContent = 'Error';
        statusEl.style.color = 'var(--danger)';
      } else {
        statusEl.textContent = 'Saved';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      }
    }

    const debouncedSaveAmount = debounce(() => saveField('amount', container.querySelector('#f-amount').value), 1000);
    container.querySelector('#f-amount').addEventListener('input', debouncedSaveAmount);

    container.querySelector('#f-status').addEventListener('change', () => {
      saveField('status', container.querySelector('#f-status').value);
    });
    container.querySelector('#f-expected').addEventListener('change', () => {
      saveField('expected_close', container.querySelector('#f-expected').value);
    });
    container.querySelector('#f-contact').addEventListener('change', () => {
      saveField('contact_id', container.querySelector('#f-contact').value);
    });
    container.querySelector('#f-company').addEventListener('change', () => {
      saveField('company_id', container.querySelector('#f-company').value);
    });

    // Log edit + delete listeners
    attachLogListeners(container, () => renderProjectDetail(container, id));

    // Refresh on log-created
    window.addEventListener('log-created', () => renderProjectDetail(container, id), { once: true });

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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
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
