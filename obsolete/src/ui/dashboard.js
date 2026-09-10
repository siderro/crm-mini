import { sb } from '../supabase.js';
import { getTemperature } from '../utils/temperature.js';
import { debounce } from '../utils/debounce.js';

let currentSearch = '';
let sortColdFirst = false;
let tempFilter = 'all'; // all | hot | warm | cold

export async function renderDashboard(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const [
      { data: contacts },
      { data: contactLogs },
      { data: projects },
      { data: unassignedLogs },
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name, email, phone, company_id, starred_at, companies(name)').order('last_name'),
      sb.from('logs').select('contact_id, project_id, logged_at, content').not('contact_id', 'is', null).order('logged_at', { ascending: false }),
      sb.from('projects').select('id, title, amount, status, expected_close, contact_id, contacts(first_name, last_name)').in('status', ['open', 'frozen']),
      sb.from('logs').select('id, content, logged_at').is('contact_id', null).is('project_id', null).order('logged_at', { ascending: false }),
    ]);

    // Build last-log map and collect next steps / waiting
    const contactLastLog = new Map();
    const nextSteps = [];
    const waitingOn = [];
    const seenForActions = new Set();

    for (const row of (contactLogs || [])) {
      if (!row.contact_id) continue;
      if (!contactLastLog.has(row.contact_id)) {
        contactLastLog.set(row.contact_id, { date: row.logged_at, content: row.content });
      }
      if (!seenForActions.has(row.contact_id)) {
        seenForActions.add(row.contact_id);
        if (row.content?.startsWith('>')) {
          nextSteps.push({ contactId: row.contact_id, content: row.content.slice(1).trim(), date: row.logged_at });
        } else if (row.content?.startsWith('?')) {
          waitingOn.push({ contactId: row.contact_id, content: row.content.slice(1).trim(), date: row.logged_at });
        }
      }
    }

    // Build project map for contacts
    const contactProjects = new Map();
    for (const p of (projects || [])) {
      if (p.contact_id) {
        if (!contactProjects.has(p.contact_id)) contactProjects.set(p.contact_id, []);
        contactProjects.get(p.contact_id).push(p);
      }
    }

    // Build enriched contacts
    const allContacts = (contacts || []).map(c => {
      const last = contactLastLog.get(c.id);
      const temp = getTemperature(last?.date);
      const cProjects = contactProjects.get(c.id) || [];
      const openDeal = cProjects.find(p => p.status === 'open');
      let happening = '';
      if (openDeal) {
        const amt = openDeal.amount ? ` (${fmtK(parseFloat(openDeal.amount))})` : '';
        happening = openDeal.title + amt;
      } else if (last?.content) {
        happening = last.content;
      }
      return { ...c, temp, lastDate: last?.date, happening };
    });

    // Filter by search
    let filtered = currentSearch
      ? allContacts.filter(c => {
          const q = normalize(currentSearch);
          return normalize(`${c.first_name} ${c.last_name}`).includes(q)
            || normalize(c.companies?.name || '').includes(q)
            || normalize(c.email || '').includes(q)
            || normalize(c.happening || '').includes(q);
        })
      : allContacts;

    // Filter by temperature
    if (tempFilter === 'hot') filtered = filtered.filter(c => c.temp.css === 'temp-hot');
    else if (tempFilter === 'warm') filtered = filtered.filter(c => c.temp.css === 'temp-warm');
    else if (tempFilter === 'cold') filtered = filtered.filter(c => c.temp.css === 'temp-cold' || c.temp.css === 'temp-dead');

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const da = a.temp.days ?? 9999;
      const db = b.temp.days ?? 9999;
      if (sortColdFirst) return db - da; // cold first: highest days first
      // hot first: lowest days first, but never-contacted at end
      if (da === 9999 && db !== 9999) return 1;
      if (db === 9999 && da !== 9999) return -1;
      return da - db;
    });

    // Stats
    const hot = allContacts.filter(c => c.temp.css === 'temp-hot').length;
    const warm = allContacts.filter(c => c.temp.css === 'temp-warm').length;
    const cold = allContacts.filter(c => c.temp.css === 'temp-cold' || c.temp.css === 'temp-dead').length;
    const openCount = (projects || []).filter(p => p.status === 'open').length;
    const openValue = (projects || []).filter(p => p.status === 'open').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

    // Overdue projects
    const overdueProjects = (projects || []).filter(p => p.status === 'open' && p.expected_close && p.expected_close < today);

    // Triage
    const triageItems = (unassignedLogs || []);
    const triageHtml = triageItems.length > 0 ? `
      <details class="triage-section">
        <summary class="triage-summary">${triageItems.length} unassigned log${triageItems.length > 1 ? 's' : ''} — click to assign</summary>
        ${triageItems.map(log => `
          <div class="triage-row" data-log-id="${log.id}">
            <span class="triage-date">${formatDate(log.logged_at)}</span>
            <span class="triage-content">${esc(log.content)}</span>
            <div class="triage-ac-wrap">
              <input type="text" class="input triage-ac-input triage-contact" placeholder="contact" autocomplete="off">
              <div class="qe-ac-list triage-contact-list"></div>
            </div>
            <div class="triage-ac-wrap">
              <input type="text" class="input triage-ac-input triage-project" placeholder="project" autocomplete="off">
              <div class="qe-ac-list triage-project-list"></div>
            </div>
            <button class="btn btn-sm btn-primary triage-save">ok</button>
            <button class="btn btn-sm btn-secondary triage-delete">&times;</button>
          </div>
        `).join('')}
      </details>
    ` : '';

    // Alerts HTML
    const hasAlerts = nextSteps.length > 0 || waitingOn.length > 0 || overdueProjects.length > 0;
    const alertsHtml = hasAlerts ? `
      <div class="cb-alerts">
        ${nextSteps.length > 0 ? `
          <div class="cb-alert-group">
            <div class="cb-alert-label">NEXT STEPS (${nextSteps.length})</div>
            ${nextSteps.slice(0, 5).map(ns => {
              const c = allContacts.find(x => x.id === ns.contactId);
              if (!c) return '';
              return `<div class="next-step clickable-row" data-href="#/crm/contacts/${c.id}">
                <strong>${esc(c.first_name)} ${esc(c.last_name)}</strong>: ${esc(ns.content)} <span class="muted">${humanDate(ns.date)}</span>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
        ${waitingOn.length > 0 ? `
          <div class="cb-alert-group">
            <div class="cb-alert-label cb-alert-label-waiting">WAITING (${waitingOn.length})</div>
            ${waitingOn.slice(0, 5).map(w => {
              const c = allContacts.find(x => x.id === w.contactId);
              if (!c) return '';
              return `<div class="next-step waiting-step clickable-row" data-href="#/crm/contacts/${c.id}">
                <strong>${esc(c.first_name)} ${esc(c.last_name)}</strong>: ${esc(w.content)} <span class="muted">${humanDate(w.date)}</span>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
        ${overdueProjects.map(p => `
          <div class="next-step waiting-step clickable-row" data-href="#/crm/projects/${p.id}">
            <strong>${esc(p.title)}</strong> — OVERDUE (exp. ${p.expected_close})
          </div>
        `).join('')}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="detail-page">
        ${triageHtml}
        ${alertsHtml}

        <div class="cb-header">
          <div class="cb-stats">
            <span>${allContacts.length} contacts</span>
            <span class="cb-filter-btn${tempFilter === 'all' ? ' active' : ''}" data-filter="all">all</span>
            <span class="cb-filter-btn${tempFilter === 'hot' ? ' active' : ''} temp-hot" data-filter="hot">${hot} hot</span>
            <span class="cb-filter-btn${tempFilter === 'warm' ? ' active' : ''}" data-filter="warm">${warm} warm</span>
            <span class="cb-filter-btn${tempFilter === 'cold' ? ' active' : ''} temp-cold" data-filter="cold">${cold} cold</span>
            ${openCount > 0 ? `<span class="muted">${openCount} projects (${fmtK(openValue)})</span>` : ''}
          </div>
          <div class="cb-actions">
            <input type="search" id="cb-search" class="input" placeholder="Search..." value="${escapeAttr(currentSearch)}" style="width:160px">
            <a href="#/crm/contacts/new" class="btn btn-primary">+ New</a>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table table-contactbase">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Company</th>
                <th class="sortable" id="sort-last-contact">Last contact ${sortColdFirst ? '\u2191' : '\u2193'}</th>
                <th>What's happening</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${sorted.length === 0
                ? `<tr><td colspan="6" class="empty-state">No contacts${currentSearch ? ' matching "' + esc(currentSearch) + '"' : ''}. <a href="#/crm/contacts/new">Create first</a>.</td></tr>`
                : sorted.map(c => `
                <tr class="clickable-row ${c.temp.css}" data-href="#/crm/contacts/${c.id}">
                  <td class="cb-temp-cell ${c.temp.css}">${c.temp.block} ${c.temp.label}</td>
                  <td><strong>${esc(c.first_name)} ${esc(c.last_name)}</strong>${c.starred_at ? ' \u2605' : ''}</td>
                  <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
                  <td>${c.temp.human}</td>
                  <td class="cb-happening">${c.happening ? esc(truncate(c.happening, 60)) : '<span class="muted">-</span>'}</td>
                  <td class="cb-quick-actions">${c.email ? `<a href="mailto:${escapeAttr(c.email)}" class="cb-qa" title="${esc(c.email)}" onclick="event.stopPropagation()">@</a>` : ''}${c.phone ? `<a href="tel:${escapeAttr(c.phone)}" class="cb-qa" title="${esc(c.phone)}" onclick="event.stopPropagation()">T</a>` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Refresh on log-created
    window.addEventListener('log-created', () => renderDashboard(container), { once: true });

    // Click handlers
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        const href = row.dataset.href;
        if (href) window.location.hash = href;
      });
    });

    // Sort toggle
    const sortBtn = container.querySelector('#sort-last-contact');
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        sortColdFirst = !sortColdFirst;
        renderDashboard(container);
      });
    }

    // Temperature filter
    container.querySelectorAll('.cb-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tempFilter = btn.dataset.filter;
        renderDashboard(container);
      });
    });

    // Search
    const searchInput = container.querySelector('#cb-search');
    if (searchInput) {
      const onSearch = debounce(() => {
        currentSearch = searchInput.value.trim();
        renderDashboard(container);
      }, 300);
      searchInput.addEventListener('input', onSearch);
      if (currentSearch) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }
    }

    // Triage handlers
    setupTriageHandlers(container, contacts || [], (projects || []).filter(p => p.status === 'open'));

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

// ── Triage ──

function setupTriageHandlers(container, allContacts, openProjects) {
  container.querySelectorAll('.triage-row').forEach(row => {
    const logId = row.dataset.logId;
    let selectedContactId = null;
    let selectedProjectId = null;

    const cInput = row.querySelector('.triage-contact');
    const cList = row.querySelector('.triage-contact-list');
    setupTriageAc(cInput, cList, allContacts, c => `${c.first_name} ${c.last_name}`, id => { selectedContactId = id; });

    const pInput = row.querySelector('.triage-project');
    const pList = row.querySelector('.triage-project-list');
    setupTriageAc(pInput, pList, openProjects, p => p.title, id => { selectedProjectId = id; });

    row.querySelector('.triage-save').addEventListener('click', async () => {
      if (!selectedContactId && !selectedProjectId) return;
      const update = {};
      if (selectedContactId) update.contact_id = selectedContactId;
      if (selectedProjectId) update.project_id = selectedProjectId;
      const { error } = await sb.from('logs').update(update).eq('id', logId);
      if (!error) {
        row.style.display = 'none';
        const visible = container.querySelectorAll('.triage-row:not([style*="display: none"])');
        if (visible.length === 0) {
          const section = container.querySelector('.triage-section');
          if (section) section.style.display = 'none';
        }
      }
    });

    row.querySelector('.triage-delete').addEventListener('click', async () => {
      const { error } = await sb.from('logs').delete().eq('id', logId);
      if (!error) {
        row.style.display = 'none';
        const visible = container.querySelectorAll('.triage-row:not([style*="display: none"])');
        if (visible.length === 0) {
          const section = container.querySelector('.triage-section');
          if (section) section.style.display = 'none';
        }
      }
    });
  });
}

function setupTriageAc(input, listEl, items, labelFn, onSelect) {
  let activeIdx = -1;
  let filtered = [];

  function render(list) {
    filtered = list;
    activeIdx = -1;
    if (list.length === 0) { listEl.style.display = 'none'; return; }
    listEl.innerHTML = list.slice(0, 6).map((item, i) =>
      `<div class="qe-ac-item" data-idx="${i}">${esc(labelFn(item))}</div>`
    ).join('');
    listEl.style.display = '';
  }

  function select(item) {
    input.value = labelFn(item);
    onSelect(item.id);
    listEl.style.display = 'none';
    filtered = [];
  }

  function setActive(idx) {
    const els = listEl.querySelectorAll('.qe-ac-item');
    els.forEach(el => el.classList.remove('qe-ac-active'));
    if (idx >= 0 && idx < els.length) { els[idx].classList.add('qe-ac-active'); activeIdx = idx; }
    else { activeIdx = -1; }
  }

  input.addEventListener('input', () => {
    const q = normalize(input.value.trim());
    onSelect(null);
    if (q.length === 0) { listEl.style.display = 'none'; return; }
    render(items.filter(item => normalize(labelFn(item)).includes(q)));
  });

  input.addEventListener('keydown', (e) => {
    if (listEl.style.display === 'none' || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && activeIdx >= 0) { e.preventDefault(); select(filtered[activeIdx]); }
    else if (e.key === 'Escape') { listEl.style.display = 'none'; }
  });

  listEl.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.qe-ac-item');
    if (!item) return;
    e.preventDefault();
    select(filtered[parseInt(item.dataset.idx)]);
  });

  input.addEventListener('blur', () => { setTimeout(() => { listEl.style.display = 'none'; }, 150); });
}

// ── Helpers ──

function humanDate(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fmtK(amount) {
  if (!amount) return '0';
  return `${Math.round(amount / 1000)}K`;
}

function truncate(str, len) {
  if (!str) return '';
  let s = str;
  if (s.startsWith('>') || s.startsWith('?')) s = s.slice(1).trim();
  return s.length > len ? s.slice(0, len) + '...' : s;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

function normalize(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
