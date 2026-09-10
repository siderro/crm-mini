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
      container.innerHTML = '<div class="error">Contact not found. <a href="#/crm">Back</a></div>';
      return;
    }

    // Last contact
    const lastLog = (logs || [])[0];
    const temp = lastLog ? getTemperature(lastLog.logged_at) : getTemperature(null);
    const lastContactLabel = `Last contact: ${temp.human}`;

    // Next step / waiting
    const firstLog = (logs || [])[0];
    const nextStepHtml = firstLog?.content?.startsWith('>')
      ? `<div class="next-step"><span class="next-step-label">NEXT:</span> ${esc(firstLog.content.slice(1).trim())} <span class="muted">${humanDate(firstLog.logged_at)}</span></div>`
      : firstLog?.content?.startsWith('?')
      ? `<div class="next-step waiting-step"><span class="waiting-step-label">WAITING:</span> ${esc(firstLog.content.slice(1).trim())} <span class="muted">${humanDate(firstLog.logged_at)}</span></div>`
      : '';

    // Related projects
    const relatedProjects = (projects || []).filter(p => {
      return (logs || []).some(l => l.project_id === p.id);
    });
    const { data: directProjects } = await sb.from('projects').select('id, title, status').eq('contact_id', id).order('title');
    const allRelated = new Map();
    for (const p of (directProjects || [])) allRelated.set(p.id, p);
    for (const p of relatedProjects) allRelated.set(p.id, p);
    const relatedList = Array.from(allRelated.values());

    // Open projects for inline log dropdown
    const openProjects = (projects || []).filter(p => {
      const rp = allRelated.get(p.id);
      return rp ? rp.status === 'open' : false;
    });
    // Include all open projects for the dropdown
    const { data: allOpenProjects } = await sb.from('projects').select('id, title').eq('status', 'open').order('title');

    // Log timeline
    const logTimelineHtml = renderLogTimeline(logs || [], 'contact', { projects: projects || [] });

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/crm" class="btn btn-back">&larr; Back</a>
            <h1>${esc(contact.first_name)} ${esc(contact.last_name)}</h1>
            <div class="detail-actions">
              <button id="toggle-star" class="btn btn-sm btn-secondary">${contact.starred_at ? '★ Unstar' : '☆ Star'}</button>
              <button id="delete-contact" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="last-contact ${temp.css}">${temp.block} ${lastContactLabel}</div>
        ${nextStepHtml}

        <div class="inline-fields-vertical">
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${escapeAttr(contact.email || '')}" placeholder="add email"> <span class="field-saved" id="fs-email"></span></label>
          <label>Phone <input type="tel" id="f-phone" class="input inline-input" value="${escapeAttr(contact.phone || '')}" placeholder="add phone"> <span class="field-saved" id="fs-phone"></span></label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(companies || []).map(c => `<option value="${c.id}"${contact.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
            <span class="field-saved" id="fs-company"></span>
          </label>
        </div>

        ${relatedList.length > 0 ? `
        <div class="related-entities">Projects: ${relatedList.map(p =>
          `<a href="#/crm/projects/${p.id}">${esc(p.title)} <span class="muted">(${p.status})</span></a>`
        ).join(' · ')}</div>` : ''}

        <div class="section-bar">Add log</div>
        <div class="inline-log-entry">
          <div class="ile-mode-toggle">
            <button class="ile-mode-btn active" data-mode="note">Note</button>
            <button class="ile-mode-btn" data-mode="next">&gt; Next</button>
            <button class="ile-mode-btn" data-mode="waiting">? Wait</button>
          </div>
          <div class="ile-row">
            <select id="ile-project" class="input ile-project-select">
              <option value="">— project —</option>
              ${(allOpenProjects || []).map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
            </select>
            <input type="text" id="ile-content" class="input ile-input" placeholder="what happened?" autocomplete="off">
            <button id="ile-save" class="btn btn-primary btn-sm">Save</button>
          </div>
          <span id="ile-status" class="ile-status"></span>
        </div>

        <div class="section-bar">Log</div>
        ${logTimelineHtml}
      </div>
    `;

    // --- Inline log entry ---
    let ileMode = 'note';
    const ilePlaceholders = { note: 'what happened?', next: 'what needs to happen next?', waiting: 'what are you waiting for?' };
    const ileContent = container.querySelector('#ile-content');
    const ileStatus = container.querySelector('#ile-status');

    container.querySelectorAll('.ile-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ileMode = btn.dataset.mode;
        container.querySelectorAll('.ile-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ileContent.placeholder = ilePlaceholders[ileMode];
        ileContent.focus();
      });
    });

    async function saveInlineLog() {
      let content = ileContent.value.trim();
      if (!content) return;
      if (ileMode === 'next') content = '>' + content;
      else if (ileMode === 'waiting') content = '?' + content;

      const projectId = container.querySelector('#ile-project').value || null;
      const user = (await sb.auth.getUser()).data.user;
      if (!user) return;

      const { error: saveError } = await sb.from('logs').insert({
        user_id: user.id,
        content,
        contact_id: id,
        project_id: projectId,
        logged_at: new Date().toISOString().slice(0, 10),
      });

      if (saveError) {
        ileStatus.textContent = 'Error';
        ileStatus.style.color = 'var(--danger)';
      } else {
        ileStatus.textContent = 'Saved';
        ileStatus.style.color = 'var(--success)';
        ileContent.value = '';
        ileMode = 'note';
        container.querySelectorAll('.ile-mode-btn').forEach(b => b.classList.remove('active'));
        container.querySelector('.ile-mode-btn[data-mode="note"]').classList.add('active');
        ileContent.placeholder = ilePlaceholders.note;
        setTimeout(() => { ileStatus.textContent = ''; }, 2000);
        window.dispatchEvent(new CustomEvent('log-created'));
        renderContactDetail(container, id);
      }
    }

    container.querySelector('#ile-save').addEventListener('click', saveInlineLog);
    ileContent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineLog(); }
    });

    // --- Autosave fields with persistent indicator ---
    async function saveField(field, value, indicatorId) {
      const indicator = container.querySelector(`#${indicatorId}`);
      if (indicator) { indicator.textContent = '...'; indicator.style.color = 'var(--yellow)'; }
      const { error: saveError } = await sb.from('contacts').update({ [field]: value || null }).eq('id', id);
      if (indicator) {
        if (saveError) {
          indicator.textContent = 'err';
          indicator.style.color = 'var(--danger)';
        } else {
          indicator.textContent = '\u2713';
          indicator.style.color = 'var(--success)';
        }
      }
    }

    const debouncedSaveEmail = debounce(() => {
      container.querySelector('#fs-email').textContent = '';
      saveField('email', container.querySelector('#f-email').value.trim(), 'fs-email');
    }, 1000);
    const debouncedSavePhone = debounce(() => {
      container.querySelector('#fs-phone').textContent = '';
      saveField('phone', container.querySelector('#f-phone').value.trim(), 'fs-phone');
    }, 1000);

    container.querySelector('#f-email').addEventListener('input', debouncedSaveEmail);
    container.querySelector('#f-phone').addEventListener('input', debouncedSavePhone);
    container.querySelector('#f-company').addEventListener('change', () => {
      saveField('company_id', container.querySelector('#f-company').value, 'fs-company');
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
        () => { window.location.hash = '#/crm'; },
        () => { window.location.hash = `#/crm/contacts/${id}`; }
      );
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function humanDate(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
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
