import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';
import { renderLogTimeline, attachLogListeners } from './logEntry.js';
import { getTemperature } from '../utils/temperature.js';
import { debounce } from '../utils/debounce.js';

export async function renderContactDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: contact, error },
      { data: logs },
      { data: companies },
      { data: projects },
    ] = await Promise.all([
      sb.from('contacts').select('*, companies(id, name)').eq('id', id).single(),
      sb.from('logs').select('*, projects(title)').eq('contact_id', id).order('logged_at', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('companies').select('id, name').order('name'),
      sb.from('projects').select('id, title').order('title'),
    ]);

    if (error || !contact) {
      container.innerHTML = '<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';
      return;
    }

    // Last contact
    const lastLog = (logs || [])[0];
    const lastContactLabel = lastLog
      ? `Last contact: ${timeAgo(lastLog.logged_at)}`
      : 'Last contact: never';
    const lastContactCss = lastLog ? getTemperature(lastLog.logged_at).css : 'temp-dead';

    // Next step
    const nextStepLog = (logs || []).find(l => l.content?.startsWith('>'));
    const nextStepHtml = nextStepLog
      ? `<div class="next-step"><span class="next-step-label">NEXT:</span> ${esc(nextStepLog.content.slice(1).trim())} <span class="muted">${formatDate(nextStepLog.logged_at)}</span></div>`
      : '';

    // Related projects (where this contact is assigned)
    const relatedProjects = (projects || []).filter(p => {
      // Check if any log links this contact to this project, or if project.contact_id matches
      return (logs || []).some(l => l.project_id === p.id);
    });
    // Also fetch projects directly linked to this contact
    const { data: directProjects } = await sb.from('projects').select('id, title, status').eq('contact_id', id).order('title');
    const allRelated = new Map();
    for (const p of (directProjects || [])) allRelated.set(p.id, p);
    for (const p of relatedProjects) allRelated.set(p.id, p);
    const relatedList = Array.from(allRelated.values());

    // Log timeline
    const logTimelineHtml = renderLogTimeline(logs || [], 'contact', { projects: projects || [] });

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/contacts" class="btn btn-back">&larr; Back</a>
            <h1>${esc(contact.first_name)} ${esc(contact.last_name)}</h1>
            <div class="detail-actions">
              <button id="toggle-star" class="btn btn-sm btn-secondary">${contact.starred_at ? '★ Unstar' : '☆ Star'}</button>
              <button id="delete-contact" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="last-contact ${lastContactCss}">${lastContactLabel}</div>
        ${nextStepHtml}

        <div class="inline-fields-vertical">
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${escapeAttr(contact.email || '')}" placeholder="add email"></label>
          <label>Phone <input type="tel" id="f-phone" class="input inline-input" value="${escapeAttr(contact.phone || '')}" placeholder="add phone"></label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(companies || []).map(c => `<option value="${c.id}"${contact.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${relatedList.length > 0 ? `
        <div class="related-entities">Projects: ${relatedList.map(p =>
          `<a href="#/projects/${p.id}">${esc(p.title)} <span class="muted">(${p.status})</span></a>`
        ).join(' · ')}</div>` : ''}

        <div class="section-bar">Log</div>
        ${logTimelineHtml}
      </div>
    `;

    // Autosave on field change
    const statusEl = container.querySelector('#inline-status');

    async function saveField(field, value) {
      const { error } = await sb.from('contacts').update({ [field]: value || null }).eq('id', id);
      if (error) {
        statusEl.textContent = 'Error';
        statusEl.style.color = 'var(--danger)';
      } else {
        statusEl.textContent = 'Saved';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      }
    }

    const debouncedSaveEmail = debounce(() => saveField('email', container.querySelector('#f-email').value.trim()), 1000);
    const debouncedSavePhone = debounce(() => saveField('phone', container.querySelector('#f-phone').value.trim()), 1000);

    container.querySelector('#f-email').addEventListener('input', debouncedSaveEmail);
    container.querySelector('#f-phone').addEventListener('input', debouncedSavePhone);
    container.querySelector('#f-company').addEventListener('change', () => {
      saveField('company_id', container.querySelector('#f-company').value);
    });

    // Star toggle
    container.querySelector('#toggle-star').addEventListener('click', async () => {
      const newVal = contact.starred_at ? null : new Date().toISOString();
      await sb.from('contacts').update({ starred_at: newVal }).eq('id', id);
      renderContactDetail(container, id);
    });

    // Log edit + delete listeners
    attachLogListeners(container, () => renderContactDetail(container, id));

    // Refresh on log-created from quick entry
    window.addEventListener('log-created', () => renderContactDetail(container, id), { once: true });

    // Delete contact
    container.querySelector('#delete-contact').addEventListener('click', async () => {
      await deleteWithUndo('contacts', contact, `"${contact.first_name} ${contact.last_name}"`,
        () => { window.location.hash = '#/contacts'; },
        () => { window.location.hash = `#/contacts/${id}`; }
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
