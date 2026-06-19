import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';
import { debounce } from '../utils/debounce.js';
import { getTemperature } from '../utils/temperature.js';

export async function renderCompanyDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: company, error },
      { data: companyContacts },
      { data: projects },
    ] = await Promise.all([
      sb.from('companies').select('*').eq('id', id).single(),
      sb.from('contacts').select('id, first_name, last_name').eq('company_id', id).order('last_name'),
      sb.from('projects').select('id, title, amount, status, updated_at').eq('company_id', id).order('updated_at', { ascending: false }),
    ]);

    if (error || !company) {
      container.innerHTML = '<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';
      return;
    }

    const contactIds = (companyContacts || []).map(c => c.id);
    const projectList = projects || [];

    // Fetch logs for all contacts at this company
    let companyLogs = [];
    if (contactIds.length > 0) {
      const { data } = await sb.from('logs')
        .select('*, contacts(first_name, last_name), projects(title)')
        .in('contact_id', contactIds)
        .order('logged_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);
      companyLogs = data || [];
    }

    // Temperature per contact
    const contactLastLog = new Map();
    for (const log of companyLogs) {
      if (log.contact_id && !contactLastLog.has(log.contact_id)) {
        contactLastLog.set(log.contact_id, log.logged_at);
      }
    }

    const contactsWithTemp = (companyContacts || []).map(c => ({
      ...c,
      temp: getTemperature(contactLastLog.get(c.id)),
    }));

    // Log timeline HTML
    const logsHtml = companyLogs.length > 0
      ? companyLogs.map(log => {
          const date = formatDate(log.logged_at);
          const contactName = log.contacts ? `${esc(log.contacts.first_name)} ${esc(log.contacts.last_name)}` : '';
          const projectTag = log.projects?.title ? ` <span class="log-tag">[${esc(log.projects.title)}]</span>` : '';
          return `<div class="log-entry">
            <span class="log-date">${date} ───</span>
            <a href="#/contacts/${log.contact_id}" class="log-tag">[${contactName}]</a>
            <span class="log-content">${esc(log.content)}</span>${projectTag}
          </div>`;
        }).join('')
      : '<div class="log-empty">No logs from contacts at this company.</div>';

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/companies" class="btn btn-back">&larr; Back</a>
            <h1>${esc(company.name)}</h1>
            <div class="detail-actions">
              <button id="delete-company" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="inline-fields-vertical">
          <label>Official name <input type="text" id="f-official" class="input inline-input" value="${escapeAttr(company.official_name || '')}" placeholder="add official name"></label>
          <label>Email <input type="email" id="f-email" class="input inline-input" value="${escapeAttr(company.email || '')}" placeholder="add email"></label>
          <label>Web <input type="url" id="f-web" class="input inline-input" value="${escapeAttr(company.web || '')}" placeholder="add website"></label>
          <label>ICO <input type="text" id="f-ico" class="input inline-input" value="${escapeAttr(company.ico || '')}" placeholder="add ICO"></label>
          <span id="inline-status" class="inline-status"></span>
        </div>

        ${contactsWithTemp.length > 0 ? `
        <div class="section-bar section-bar-contacts">Contacts (${contactsWithTemp.length})</div>
        <div class="compact-list">
          ${contactsWithTemp.map(c => `
            <div class="compact-list-item clickable-row ${c.temp.css}" data-href="#/contacts/${c.id}">
              <strong>${esc(c.first_name)} ${esc(c.last_name)}</strong> · ${c.temp.label}
            </div>
          `).join('')}
        </div>` : ''}

        ${projectList.length > 0 ? `
        <div class="section-bar section-bar-deals">Projects (${projectList.length})</div>
        <div class="compact-list">
          ${projectList.map(d => `
            <div class="compact-list-item clickable-row" data-href="#/projects/${d.id}">
              <strong>${esc(d.title)}</strong> · <span class="status-badge status-${d.status}">${getStatusLabel(d.status)}</span>
              ${d.amount ? ` · ${Math.round(parseFloat(d.amount) / 1000)}K` : ''}
            </div>
          `).join('')}
        </div>` : ''}

        <div class="section-bar">Log</div>
        <div class="log-timeline">${logsHtml}</div>
      </div>
    `;

    // Autosave
    const statusEl = container.querySelector('#inline-status');

    async function saveField(field, value) {
      const { error } = await sb.from('companies').update({ [field]: value || null }).eq('id', id);
      if (error) {
        statusEl.textContent = 'Error';
        statusEl.style.color = 'var(--danger)';
      } else {
        statusEl.textContent = 'Saved';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      }
    }

    const debouncedSave = (field, selector) => debounce(() => saveField(field, container.querySelector(selector).value.trim()), 1000);

    container.querySelector('#f-official').addEventListener('input', debouncedSave('official_name', '#f-official'));
    container.querySelector('#f-email').addEventListener('input', debouncedSave('email', '#f-email'));
    container.querySelector('#f-web').addEventListener('input', debouncedSave('web', '#f-web'));
    container.querySelector('#f-ico').addEventListener('input', debouncedSave('ico', '#f-ico'));

    // Delete
    container.querySelector('#delete-company').addEventListener('click', async () => {
      await deleteWithUndo('companies', company, `"${company.name}"`,
        () => { window.location.hash = '#/companies'; },
        () => { window.location.hash = `#/companies/${id}`; }
      );
    });

    // Click rows
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        const href = row.dataset.href;
        if (href) window.location.hash = href;
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function getStatusLabel(status) {
  const labels = { 'open': 'Open', 'frozen': 'Frozen', 'won': 'Won', 'lost': 'Lost' };
  return labels[status] || status;
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
