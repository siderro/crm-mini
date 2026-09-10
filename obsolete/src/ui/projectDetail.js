import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';
import { renderLogTimeline, attachLogListeners } from './logEntry.js';
import { debounce } from '../utils/debounce.js';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', desc: 'actively working' },
  { value: 'frozen', label: 'Frozen', desc: 'paused, will revisit' },
  { value: 'won', label: 'Won', desc: 'closed successfully' },
  { value: 'lost', label: 'Lost', desc: 'did not work out' },
];

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
      container.innerHTML = '<div class="error">Project not found. <a href="#/crm/projects">Back</a></div>';
      return;
    }

    // Next step / waiting
    const firstLog = (logs || [])[0];
    const nextStepHtml = firstLog?.content?.startsWith('>')
      ? `<div class="next-step"><span class="next-step-label">NEXT:</span> ${esc(firstLog.content.slice(1).trim())} <span class="muted">${humanDate(firstLog.logged_at)}</span></div>`
      : firstLog?.content?.startsWith('?')
      ? `<div class="next-step waiting-step"><span class="waiting-step-label">WAITING:</span> ${esc(firstLog.content.slice(1).trim())} <span class="muted">${humanDate(firstLog.logged_at)}</span></div>`
      : '';

    // Expected close countdown
    let closeInfo = '';
    if (project.expected_close) {
      const daysLeft = Math.floor((new Date(project.expected_close).getTime() - Date.now()) / 86400000);
      if (daysLeft < 0) closeInfo = `<strong class="overdue-label">OVERDUE ${Math.abs(daysLeft)}d</strong>`;
      else if (daysLeft === 0) closeInfo = `<span class="temp-warm">due today</span>`;
      else if (daysLeft <= 7) closeInfo = `<span class="temp-warm">due in ${daysLeft}d</span>`;
      else closeInfo = `<span class="muted">due in ${daysLeft}d</span>`;
    }

    const logTimelineHtml = renderLogTimeline(logs || [], 'project', { contacts: contacts || [] });

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/crm/projects" class="btn btn-back">&larr; Back</a>
            <h1>${esc(project.title)}</h1>
            <div class="detail-actions">
              <button id="delete-project" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        ${nextStepHtml}

        <div class="inline-fields-vertical">
          <label>Amount <input type="number" id="f-amount" class="input inline-input" value="${project.amount || ''}" placeholder="—" step="1"> <span class="field-saved" id="fs-amount"></span></label>
          <label>Status
            <select id="f-status" class="input inline-input">
              ${STATUS_OPTIONS.map(s => `<option value="${s.value}"${project.status === s.value ? ' selected' : ''}>${s.label} — ${s.desc}</option>`).join('')}
            </select>
            <span class="field-saved" id="fs-status"></span>
          </label>
          <label>Expected close <input type="date" id="f-expected" class="input inline-input" value="${project.expected_close || ''}"> ${closeInfo} <span class="field-saved" id="fs-expected"></span></label>
          <label>Contact
            <select id="f-contact" class="input inline-input">
              <option value="">—</option>
              ${(contacts || []).map(c => `<option value="${c.id}"${project.contact_id === c.id ? ' selected' : ''}>${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
            </select>
            <span class="field-saved" id="fs-contact"></span>
          </label>
          <label>Company
            <select id="f-company" class="input inline-input">
              <option value="">—</option>
              ${(companies || []).map(c => `<option value="${c.id}"${project.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
            <span class="field-saved" id="fs-company"></span>
          </label>
        </div>

        <div class="section-bar">Add log</div>
        <div class="inline-log-entry">
          <div class="ile-mode-toggle">
            <button class="ile-mode-btn active" data-mode="note">Note</button>
            <button class="ile-mode-btn" data-mode="next">&gt; Next</button>
            <button class="ile-mode-btn" data-mode="waiting">? Wait</button>
          </div>
          <div class="ile-row">
            <select id="ile-contact" class="input ile-project-select">
              <option value="">— contact —</option>
              ${(contacts || []).map(c => `<option value="${c.id}"${project.contact_id === c.id ? ' selected' : ''}>${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
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

      const contactId = container.querySelector('#ile-contact').value || null;
      const user = (await sb.auth.getUser()).data.user;
      if (!user) return;

      const { error: saveError } = await sb.from('logs').insert({
        user_id: user.id,
        content,
        contact_id: contactId,
        project_id: id,
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
        renderProjectDetail(container, id);
      }
    }

    container.querySelector('#ile-save').addEventListener('click', saveInlineLog);
    ileContent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineLog(); }
    });

    // --- Autosave with persistent indicator ---
    async function saveField(field, value, indicatorId) {
      const indicator = container.querySelector(`#${indicatorId}`);
      if (indicator) { indicator.textContent = '...'; indicator.style.color = 'var(--yellow)'; }
      const { error: saveError } = await sb.from('projects').update({ [field]: value || null }).eq('id', id);
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

    const debouncedSaveAmount = debounce(() => saveField('amount', container.querySelector('#f-amount').value, 'fs-amount'), 1000);
    container.querySelector('#f-amount').addEventListener('input', debouncedSaveAmount);
    container.querySelector('#f-status').addEventListener('change', () => saveField('status', container.querySelector('#f-status').value, 'fs-status'));
    container.querySelector('#f-expected').addEventListener('change', () => saveField('expected_close', container.querySelector('#f-expected').value, 'fs-expected'));
    container.querySelector('#f-contact').addEventListener('change', () => saveField('contact_id', container.querySelector('#f-contact').value, 'fs-contact'));
    container.querySelector('#f-company').addEventListener('change', () => saveField('company_id', container.querySelector('#f-company').value, 'fs-company'));

    // Log edit + delete listeners
    attachLogListeners(container, () => renderProjectDetail(container, id));

    // Refresh on log-created
    window.addEventListener('log-created', () => renderProjectDetail(container, id), { once: true });

    // Delete project
    container.querySelector('#delete-project').addEventListener('click', async () => {
      await deleteWithUndo('projects', project, `"${project.title}"`,
        () => { window.location.hash = '#/crm/projects'; },
        () => { window.location.hash = `#/crm/projects/${id}`; }
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
