import { sb } from '../supabase.js';
import { getTemperature, renderTempLegend } from '../utils/temperature.js';

export async function renderDashboard(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(now - 14 * 86400000).toISOString().slice(0, 10);

    const [
      { data: contacts },
      { data: projects },
      { data: contactLogs },
      { data: projectLogs },
      { data: thisWeekLogs },
      { data: lastWeekLogs },
      { data: recentWons },
      { data: unassignedLogs },
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name, email, phone, company_id, starred_at, companies(name)').order('last_name'),
      sb.from('projects').select('id, title, amount, status, expected_close, updated_at, contact_id, contacts(first_name, last_name)').order('title'),
      sb.from('logs').select('contact_id, project_id, logged_at, content').not('contact_id', 'is', null).order('logged_at', { ascending: false }),
      sb.from('logs').select('project_id, logged_at, content').not('project_id', 'is', null).order('logged_at', { ascending: false }),
      sb.from('logs').select('id, contact_id, logged_at').gte('logged_at', weekAgo),
      sb.from('logs').select('id').gte('logged_at', twoWeeksAgo).lt('logged_at', weekAgo),
      sb.from('projects').select('id, title, amount, updated_at').eq('status', 'won').gte('updated_at', new Date(now - 7 * 86400000).toISOString()),
      sb.from('logs').select('id, content, logged_at').is('contact_id', null).is('project_id', null).order('logged_at', { ascending: false }),
    ]);

    // Build last-log maps
    const contactLastLog = new Map();
    const contactOwnContent = new Map(); // content from logs without project_id (deduplicated)
    for (const row of (contactLogs || [])) {
      if (row.contact_id && !contactLastLog.has(row.contact_id)) {
        contactLastLog.set(row.contact_id, { date: row.logged_at, content: row.content });
      }
      if (row.contact_id && !row.project_id && !contactOwnContent.has(row.contact_id)) {
        contactOwnContent.set(row.contact_id, row.content);
      }
    }
    const projectLastLog = new Map();
    for (const row of (projectLogs || [])) {
      if (row.project_id && !projectLastLog.has(row.project_id)) {
        projectLastLog.set(row.project_id, { date: row.logged_at, content: row.content });
      }
    }

    // Temperatures
    const allContacts = (contacts || []).map(c => {
      const last = contactLastLog.get(c.id);
      return { ...c, temp: getTemperature(last?.date), lastContent: last?.content || '', ownContent: contactOwnContent.get(c.id) || '' };
    });
    const openProjects = (projects || [])
      .filter(p => p.status === 'open' || p.status === 'frozen')
      .map(p => {
        const last = projectLastLog.get(p.id);
        return { ...p, temp: getTemperature(last?.date), lastContent: last?.content || '' };
      });

    // Stats
    const activeContacts = allContacts.filter(c => c.temp.css === 'temp-hot').length;
    const warmContacts = allContacts.filter(c => c.temp.css === 'temp-warm').length;
    const coldContacts = allContacts.filter(c => c.temp.css === 'temp-cold' || c.temp.css === 'temp-dead').length;
    const openProjectsList = (projects || []).filter(p => p.status === 'open');
    const frozenProjectsList = (projects || []).filter(p => p.status === 'frozen');
    const openValue = openProjectsList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const frozenValue = frozenProjectsList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const totalPipeline = openValue + frozenValue;

    // Weekly
    const thisWeekCount = (thisWeekLogs || []).length;
    const thisWeekContacts = new Set((thisWeekLogs || []).filter(l => l.contact_id).map(l => l.contact_id)).size;
    const lastWeekCount = (lastWeekLogs || []).length;
    const logDays = new Set((thisWeekLogs || []).map(l => l.logged_at));
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      if (logDays.has(d)) streak++;
      else break;
    }

    // Won this week
    const wonHtml = (recentWons || []).length > 0
      ? (recentWons || []).map(w => `Won: ${esc(w.title)} (${fmtK(parseFloat(w.amount) || 0)})`).join(' &middot; ')
      : '';

    // Counts
    const zeroHistoryCount = allContacts.filter(c => c.temp.days === null).length;
    const incompleteCount = allContacts.filter(c => !c.email || !c.phone || !c.company_id).length;

    // Overdue projects
    const overdueProjects = openProjects.filter(p => p.expected_close && p.expected_close < today);

    // Starred contacts (active: starred < 7 days ago AND no log since starring)
    const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
    const starredContacts = allContacts.filter(c => {
      if (!c.starred_at) return false;
      if (c.starred_at < sevenDaysAgo) return false;
      // Check if there's a log after starring
      const lastLogDate = contactLastLog.get(c.id)?.date;
      if (lastLogDate && new Date(lastLogDate) > new Date(c.starred_at)) return false;
      return true;
    });

    // Nudge
    const nudgeContacts = allContacts
      .filter(c => c.temp.days !== null && c.temp.days >= 14 && c.temp.days < 60)
      .sort((a, b) => b.temp.days - a.temp.days)
      .slice(0, 5);

    // Next steps and waiting — based on most recent log per contact
    const nextSteps = [];
    const waitingOn = [];
    const seenContacts = new Set();
    for (const row of (contactLogs || [])) {
      if (row.contact_id && !seenContacts.has(row.contact_id)) {
        seenContacts.add(row.contact_id);
        const contact = allContacts.find(c => c.id === row.contact_id);
        if (!contact) continue;
        if (row.content?.startsWith('>')) {
          nextSteps.push({ contact, content: row.content.slice(1).trim(), date: row.logged_at });
        } else if (row.content?.startsWith('?')) {
          waitingOn.push({ contact, content: row.content.slice(1).trim(), date: row.logged_at });
        }
      }
    }

    // Radar — all contacts, coldest/no-log first
    const radarContacts = [...allContacts]
      .sort((a, b) => (b.temp.days ?? 9999) - (a.temp.days ?? 9999))
      .slice(0, 15);
    const radarProjects = [...openProjects]
      .sort((a, b) => (b.temp.days ?? 9999) - (a.temp.days ?? 9999))
      .slice(0, 15);

    // Progress bars
    const pipelinePct = totalPipeline > 0 ? Math.round((openValue / totalPipeline) * 100) : 0;
    const allClosed = (projects || []).filter(p => p.status === 'won' || p.status === 'lost');
    const wonCount = (projects || []).filter(p => p.status === 'won').length;
    const wonValue = (projects || []).filter(p => p.status === 'won').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const winPct = allClosed.length > 0 ? Math.round((wonCount / allClosed.length) * 100) : 0;
    const aliveContacts = allContacts.filter(c => c.temp.days !== null && c.temp.days < 30).length;
    const alivePct = allContacts.length > 0 ? Math.round((aliveContacts / allContacts.length) * 100) : 0;

    // Triage: unassigned logs
    const triageItems = (unassignedLogs || []);
    const triageHtml = triageItems.length > 0 ? `
      <div class="triage-section">
        <div class="section-bar">${triageItems.length} unassigned — assign contact/project</div>
        ${triageItems.map(log => `
          <div class="triage-row" data-log-id="${log.id}">
            <span class="triage-date">${formatTriageDate(log.logged_at)}</span>
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
      </div>
    ` : '';

    container.innerHTML = `
      <div class="detail-page">
        ${triageHtml}
        <div class="dashboard-pulse">
          <span>${allContacts.length} contacts &middot; <span class="temp-hot">${activeContacts} active</span> &middot; ${warmContacts} warm &middot; <strong>${coldContacts} cold</strong></span>
          <span>${openProjectsList.length} open (${fmtK(openValue)}) &middot; ${frozenProjectsList.length} frozen (${fmtK(frozenValue)})${wonHtml ? ` &middot; ${wonHtml}` : ''}</span>
          <span>This week: ${thisWeekCount} logs &middot; ${thisWeekContacts} contacts${lastWeekCount ? ` &middot; last week: ${lastWeekCount}` : ''}${streak > 1 ? ` &middot; ${streak}-day streak` : ''}</span>
          ${renderTempLegend()}
        </div>

        <div class="dashboard-main">
          <div class="dashboard-content">

            ${starredContacts.length > 0 ? `
            <div class="dashboard-starred">
              ${starredContacts.map(c => `
                <span class="starred-item clickable-row" data-href="#/contacts/${c.id}">★ <strong>${esc(c.first_name)} ${esc(c.last_name)}</strong></span>
              `).join('')}
            </div>
            ` : ''}

            ${nextSteps.length > 0 ? `
            <div class="dashboard-nextsteps">
              <div class="section-bar">Next steps</div>
              ${nextSteps.slice(0, 5).map(ns => `
                <div class="next-step clickable-row" data-href="#/contacts/${ns.contact.id}">
                  <strong>${esc(ns.contact.first_name)} ${esc(ns.contact.last_name)}</strong>: ${esc(ns.content)}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${waitingOn.length > 0 ? `
            <div class="dashboard-waiting">
              <div class="section-bar">Waiting on</div>
              ${waitingOn.slice(0, 5).map(w => `
                <div class="next-step waiting-step clickable-row" data-href="#/contacts/${w.contact.id}">
                  <strong>${esc(w.contact.first_name)} ${esc(w.contact.last_name)}</strong>: ${esc(w.content)}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${nudgeContacts.length > 0 || overdueProjects.length > 0 ? `
            <div class="dashboard-nudges">
              ${nudgeContacts.map(c => `
                <span class="nudge-item clickable-row" data-href="#/contacts/${c.id}"><strong>${esc(c.first_name)} ${esc(c.last_name)}</strong> ─── ${c.temp.label} without contact</span>
              `).join('')}
              ${overdueProjects.map(p => `
                <span class="nudge-item clickable-row" data-href="#/projects/${p.id}"><strong>${esc(p.title)}</strong> ─── OVERDUE (exp. ${p.expected_close})</span>
              `).join('')}
            </div>
            ` : ''}

            ${zeroHistoryCount > 0 || incompleteCount > 0 ? `
            <div class="dashboard-hygiene">
              <div class="section-bar">Hygiene</div>
              ${zeroHistoryCount > 0 ? `<span class="nudge-meta clickable-row" data-href="#/contacts">${zeroHistoryCount} contacts with zero history</span>` : ''}
              ${incompleteCount > 0 ? `<span class="nudge-meta clickable-row" data-href="#/contacts">${incompleteCount} incomplete contacts</span>` : ''}
            </div>
            ` : ''}

            <div class="dashboard-radar">
              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-contacts">Contacts</div>
                ${radarContacts.length === 0
                  ? '<div class="empty-state">No logged contacts.</div>'
                  : `<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Name</th><th>Company</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${radarContacts.map(c => `
                          <tr class="clickable-row ${c.temp.css}" data-href="#/contacts/${c.id}">
                            <td>
                              <strong>${esc(c.first_name)} ${esc(c.last_name)}</strong>
                              ${c.ownContent ? `<div class="log-snippet">${esc(truncate(c.ownContent, 80))}</div>` : ''}
                            </td>
                            <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
                            <td class="${c.temp.css}">${c.temp.label}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>`}
              </div>

              <div class="dashboard-radar-col">
                <div class="section-bar section-bar-deals">Projects</div>
                ${radarProjects.length === 0
                  ? '<div class="empty-state">No open projects.</div>'
                  : `<div class="table-wrap">
                    <table class="data-table">
                      <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Temp</th></tr></thead>
                      <tbody>
                        ${radarProjects.map(p => `
                          <tr class="clickable-row ${p.temp.css}" data-href="#/projects/${p.id}">
                            <td>
                              <strong>${esc(p.title)}</strong>
                              ${p.lastContent ? `<div class="log-snippet">${esc(truncate(p.lastContent, 80))}</div>` : ''}
                            </td>
                            <td>${p.amount ? fmtK(parseFloat(p.amount)) : '-'}</td>
                            <td>${p.contacts ? `${esc(p.contacts.first_name)} ${esc(p.contacts.last_name)}` : '<span class="muted">-</span>'}</td>
                            <td class="${p.temp.css}">${p.temp.label}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>`}
              </div>
            </div>
          </div>

          <div class="dashboard-sidebar">
            <div class="section-bar">Pipeline</div>
            <div class="progress-item">
              <span>Open ${fmtK(openValue)} / ${fmtK(totalPipeline)}</span>
              <div class="progress-bar">${renderProgressBar(pipelinePct)}</div>
            </div>

            <div class="section-bar" style="margin-top:0.75rem">System health</div>
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Contacts alive ${aliveContacts}/${allContacts.length}</span>
              <div class="progress-bar">${renderProgressBar(alivePct)}</div>
            </div>
            <div class="progress-item">
              <span>Win rate ${winPct}% (${wonCount}/${allClosed.length})</span>
              <div class="progress-bar">${renderProgressBar(winPct)}</div>
            </div>
            ${incompleteCount > 0 ? `
            <div class="progress-item clickable-row" data-href="#/contacts">
              <span>Complete ${allContacts.length - incompleteCount}/${allContacts.length}</span>
              <div class="progress-bar">${renderProgressBar(Math.round(((allContacts.length - incompleteCount) / Math.max(allContacts.length, 1)) * 100))}</div>
            </div>` : ''}
          </div>
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

    // --- Triage handlers ---
    const allContactsList = contacts || [];
    const openProjectsList2 = (projects || []).filter(p => p.status === 'open');

    container.querySelectorAll('.triage-row').forEach(row => {
      const logId = row.dataset.logId;
      let selectedContactId = null;
      let selectedProjectId = null;

      // Contact autocomplete
      const cInput = row.querySelector('.triage-contact');
      const cList = row.querySelector('.triage-contact-list');
      setupTriageAc(cInput, cList, allContactsList, c => `${c.first_name} ${c.last_name}`, id => { selectedContactId = id; });

      // Project autocomplete
      const pInput = row.querySelector('.triage-project');
      const pList = row.querySelector('.triage-project-list');
      setupTriageAc(pInput, pList, openProjectsList2, p => p.title, id => { selectedProjectId = id; });

      // Save
      row.querySelector('.triage-save').addEventListener('click', async () => {
        if (!selectedContactId && !selectedProjectId) return;
        const update = {};
        if (selectedContactId) update.contact_id = selectedContactId;
        if (selectedProjectId) update.project_id = selectedProjectId;
        const { error } = await sb.from('logs').update(update).eq('id', logId);
        if (!error) {
          row.style.display = 'none';
          // Check if all triage rows are hidden
          const visible = container.querySelectorAll('.triage-row:not([style*="display: none"])');
          if (visible.length === 0) {
            const section = container.querySelector('.triage-section');
            if (section) section.style.display = 'none';
          }
        }
      });

      // Delete
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

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function renderProgressBar(pct) {
  const total = 20;
  const filled = Math.round((pct / 100) * total);
  const empty = total - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ` ${pct}%`;
}

function fmtK(amount) {
  if (!amount) return '0';
  return `${Math.round(amount / 1000)}K`;
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

function normalize(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatTriageDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
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
    const idx = parseInt(item.dataset.idx);
    if (filtered[idx]) select(filtered[idx]);
  });

  input.addEventListener('blur', () => { setTimeout(() => { listEl.style.display = 'none'; }, 150); });
}
