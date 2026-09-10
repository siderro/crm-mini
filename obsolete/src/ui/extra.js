import { sb } from '../supabase.js';
import { getTemperature } from '../utils/temperature.js';

let activeTab = 'notes';

export async function renderExtra(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const user = (await sb.auth.getUser()).data.user;

    container.innerHTML = `
      <div class="page-header">
        <h1>Extra</h1>
      </div>
      <div class="extra-tabs">
        <a href="#" class="extra-tab${activeTab === 'notes' ? ' active' : ''}" data-tab="notes">Notes</a>
        <a href="#" class="extra-tab${activeTab === 'stats' ? ' active' : ''}" data-tab="stats">Stats</a>
        <a href="#" class="extra-tab${activeTab === 'export' ? ' active' : ''}" data-tab="export">Export</a>
        <a href="#" class="extra-tab${activeTab === 'uikit' ? ' active' : ''}" data-tab="uikit">UI Kit</a>
      </div>
      <div id="extra-content"></div>
    `;

    container.querySelectorAll('.extra-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        activeTab = tab.dataset.tab;
        renderExtra(container);
      });
    });

    const content = container.querySelector('#extra-content');

    if (activeTab === 'notes') {
      await renderNotes(content, user);
    } else if (activeTab === 'stats') {
      await renderStats(content);
    } else if (activeTab === 'export') {
      await renderExport(content, user);
    } else if (activeTab === 'uikit') {
      renderUIKit(content);
    }

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

// ── Notes tab ──

async function renderNotes(container, user) {
  const { data } = await sb.from('inbox').select('content').eq('user_id', user.id).single();
  const content = data?.content || '';
  let rowExists = !!data;

  container.innerHTML = `
    <div class="notes-toolbar">
      <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
      <span id="inbox-status"></span>
      <button id="inbox-save" class="btn btn-sm btn-primary">Save</button>
    </div>
    <textarea id="inbox-content" class="input inbox-textarea">${esc(content)}</textarea>
  `;

  container.querySelector('#inbox-save').addEventListener('click', async () => {
    const val = container.querySelector('#inbox-content').value;
    const now = new Date().toISOString();
    let error;
    if (rowExists) {
      ({ error } = await sb.from('inbox').update({ content: val, updated_at: now }).eq('user_id', user.id));
    } else {
      ({ error } = await sb.from('inbox').insert({ user_id: user.id, content: val, updated_at: now }));
      if (!error) rowExists = true;
    }
    const status = container.querySelector('#inbox-status');
    if (error) {
      status.textContent = 'Error: ' + error.message;
      status.style.color = 'var(--danger)';
    } else {
      status.textContent = 'Saved';
      status.style.color = 'var(--success)';
      setTimeout(() => { status.textContent = ''; }, 2000);
    }
  });

  container.querySelector('#add-timestamp-btn').addEventListener('click', () => {
    const textarea = container.querySelector('#inbox-content');
    const timestamp = formatTimestamp(new Date());
    const pos = textarea.selectionStart;
    const before = textarea.value.substring(0, pos);
    const after = textarea.value.substring(pos);
    const nl = before && !before.endsWith('\n') ? '\n' : '';
    textarea.value = before + nl + timestamp + '\n' + after;
    const newPos = before.length + nl.length + timestamp.length + 1;
    textarea.focus();
    textarea.setSelectionRange(newPos, newPos);
  });
}

// ── Stats tab (old dashboard metrics) ──

async function renderStats(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(now - 14 * 86400000).toISOString().slice(0, 10);

    const [
      { data: contacts },
      { data: projects },
      { data: contactLogs },
      { data: thisWeekLogs },
      { data: lastWeekLogs },
      { data: recentWons },
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name, email, phone, company_id'),
      sb.from('projects').select('id, title, amount, status, updated_at'),
      sb.from('logs').select('contact_id, logged_at').not('contact_id', 'is', null).order('logged_at', { ascending: false }),
      sb.from('logs').select('id, contact_id, logged_at').gte('logged_at', weekAgo),
      sb.from('logs').select('id').gte('logged_at', twoWeeksAgo).lt('logged_at', weekAgo),
      sb.from('projects').select('id, title, amount, updated_at').eq('status', 'won').gte('updated_at', new Date(now - 7 * 86400000).toISOString()),
    ]);

    // Last log per contact
    const contactLastLog = new Map();
    for (const row of (contactLogs || [])) {
      if (row.contact_id && !contactLastLog.has(row.contact_id)) {
        contactLastLog.set(row.contact_id, row.logged_at);
      }
    }

    const allContacts = (contacts || []).map(c => ({
      ...c, temp: getTemperature(contactLastLog.get(c.id))
    }));

    // Counts
    const hot = allContacts.filter(c => c.temp.css === 'temp-hot').length;
    const warm = allContacts.filter(c => c.temp.css === 'temp-warm').length;
    const cold = allContacts.filter(c => c.temp.css === 'temp-cold' || c.temp.css === 'temp-dead').length;
    const zeroHistory = allContacts.filter(c => c.temp.days === null).length;
    const incomplete = allContacts.filter(c => !c.email || !c.phone || !c.company_id).length;
    const aliveContacts = allContacts.filter(c => c.temp.days !== null && c.temp.days < 30).length;
    const alivePct = allContacts.length > 0 ? Math.round((aliveContacts / allContacts.length) * 100) : 0;

    // Projects
    const openProjects = (projects || []).filter(p => p.status === 'open');
    const frozenProjects = (projects || []).filter(p => p.status === 'frozen');
    const openValue = openProjects.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const frozenValue = frozenProjects.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const totalPipeline = openValue + frozenValue;
    const pipelinePct = totalPipeline > 0 ? Math.round((openValue / totalPipeline) * 100) : 0;

    const allClosed = (projects || []).filter(p => p.status === 'won' || p.status === 'lost');
    const wonCount = (projects || []).filter(p => p.status === 'won').length;
    const winPct = allClosed.length > 0 ? Math.round((wonCount / allClosed.length) * 100) : 0;

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

    const wonHtml = (recentWons || []).length > 0
      ? (recentWons || []).map(w => `Won: ${esc(w.title)} (${fmtK(parseFloat(w.amount) || 0)})`).join(' &middot; ')
      : '';

    container.innerHTML = `
      <div class="section-bar">Contacts</div>
      <div style="padding:4px 0;margin-bottom:12px">
        <span>${allContacts.length} total</span> &middot;
        <span class="temp-hot">${hot} hot</span> &middot;
        <span>${warm} warm</span> &middot;
        <span class="temp-cold">${cold} cold</span>
        <span class="temp-legend">\u2588 hot &nbsp; \u2593 warm &nbsp; \u2591 cold</span>
      </div>

      <div class="section-bar">Pipeline</div>
      <div style="padding:4px 0;margin-bottom:12px">
        <div class="progress-item">
          <span>${openProjects.length} open (${fmtK(openValue)}) &middot; ${frozenProjects.length} frozen (${fmtK(frozenValue)})</span>
          <div class="progress-bar">${renderProgressBar(pipelinePct)} open</div>
        </div>
        ${wonHtml ? `<div style="margin-top:4px">${wonHtml}</div>` : ''}
      </div>

      <div class="section-bar">Health</div>
      <div style="padding:4px 0;margin-bottom:12px">
        <div class="progress-item">
          <span>Contacts alive (< 30d): ${aliveContacts}/${allContacts.length}</span>
          <div class="progress-bar">${renderProgressBar(alivePct)}</div>
        </div>
        <div class="progress-item">
          <span>Win rate: ${wonCount}/${allClosed.length}</span>
          <div class="progress-bar">${renderProgressBar(winPct)}</div>
        </div>
        <div class="progress-item">
          <span>Complete: ${allContacts.length - incomplete}/${allContacts.length}</span>
          <div class="progress-bar">${renderProgressBar(allContacts.length > 0 ? Math.round(((allContacts.length - incomplete) / allContacts.length) * 100) : 0)}</div>
        </div>
      </div>

      <div class="section-bar">This week</div>
      <div style="padding:4px 0;margin-bottom:12px">
        <span>${thisWeekCount} logs</span> &middot;
        <span>${thisWeekContacts} contacts reached</span>
        ${lastWeekCount ? ` &middot; <span class="muted">last week: ${lastWeekCount}</span>` : ''}
        ${streak > 1 ? ` &middot; <span>${streak}-day streak</span>` : ''}
      </div>

      <div class="section-bar">Hygiene</div>
      <div style="padding:4px 0">
        ${zeroHistory > 0 ? `<div>${zeroHistory} contacts with zero history</div>` : ''}
        ${incomplete > 0 ? `<div>${incomplete} incomplete contacts (missing email/phone/company)</div>` : ''}
        ${zeroHistory === 0 && incomplete === 0 ? '<div class="muted">All clean</div>' : ''}
      </div>
    `;
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

// ── Export tab ──

async function renderExport(container) {
  container.innerHTML = `
    <div class="export-section">
      <div class="section-bar">Full export (JSON)</div>
      <p class="muted">All tables: contacts, companies, projects, inbox, logs.</p>
      <button id="export-json" class="btn btn-secondary">Export JSON</button>
      <span id="status-json"></span>
    </div>

    <div class="export-section">
      <div class="section-bar">Contacts (Markdown)</div>
      <p class="muted">All contacts with company, email, phone, last log.</p>
      <button id="export-contacts-md" class="btn btn-secondary">Export MD</button>
      <span id="status-contacts-md"></span>
    </div>

    <div class="export-section">
      <div class="section-bar">Open projects (Markdown)</div>
      <p class="muted">Open and frozen projects with contact, amount, last log.</p>
      <button id="export-projects-md" class="btn btn-secondary">Export MD</button>
      <span id="status-projects-md"></span>
    </div>
  `;

  // JSON export
  container.querySelector('#export-json').addEventListener('click', async () => {
    const btn = container.querySelector('#export-json');
    const status = container.querySelector('#status-json');
    btn.disabled = true;
    status.textContent = 'Exporting...';

    try {
      const tables = ['contacts', 'companies', 'projects', 'inbox', 'logs'];
      const result = { exported_at: new Date().toISOString(), tables: {} };
      for (const t of tables) {
        const { data, error } = await sb.from(t).select('*');
        if (error) throw new Error(`${t}: ${error.message}`);
        result.tables[t] = data || [];
      }
      download(`crm-export-${today()}.json`, JSON.stringify(result, null, 2), 'application/json');
      status.textContent = 'Done';
      status.style.color = 'var(--success)';
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      status.style.color = 'var(--danger)';
    } finally {
      btn.disabled = false;
    }
  });

  // Contacts MD export
  container.querySelector('#export-contacts-md').addEventListener('click', async () => {
    const btn = container.querySelector('#export-contacts-md');
    const status = container.querySelector('#status-contacts-md');
    btn.disabled = true;
    status.textContent = 'Exporting...';

    try {
      const { data: contacts } = await sb.from('contacts').select('*, companies(name)').order('last_name');
      const { data: logs } = await sb.from('logs').select('contact_id, logged_at, content').not('contact_id', 'is', null).order('logged_at', { ascending: false });

      const lastLogMap = new Map();
      for (const l of (logs || [])) {
        if (l.contact_id && !lastLogMap.has(l.contact_id)) lastLogMap.set(l.contact_id, l);
      }

      let md = `# Contacts\n\nExported: ${today()}\n\n`;
      for (const c of (contacts || [])) {
        md += `## ${c.first_name} ${c.last_name}\n`;
        if (c.companies?.name) md += `- Company: ${c.companies.name}\n`;
        if (c.email) md += `- Email: ${c.email}\n`;
        if (c.phone) md += `- Phone: ${c.phone}\n`;
        const last = lastLogMap.get(c.id);
        if (last) md += `- Last log (${last.logged_at}): ${last.content}\n`;
        md += '\n';
      }

      download(`contacts-${today()}.md`, md, 'text/markdown');
      status.textContent = 'Done';
      status.style.color = 'var(--success)';
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      status.style.color = 'var(--danger)';
    } finally {
      btn.disabled = false;
    }
  });

  // Open projects MD export
  container.querySelector('#export-projects-md').addEventListener('click', async () => {
    const btn = container.querySelector('#export-projects-md');
    const status = container.querySelector('#status-projects-md');
    btn.disabled = true;
    status.textContent = 'Exporting...';

    try {
      const { data: projects } = await sb.from('projects')
        .select('*, contacts(first_name, last_name), companies(name)')
        .in('status', ['open', 'frozen'])
        .order('title');
      const { data: logs } = await sb.from('logs').select('project_id, logged_at, content').not('project_id', 'is', null).order('logged_at', { ascending: false });

      const lastLogMap = new Map();
      for (const l of (logs || [])) {
        if (l.project_id && !lastLogMap.has(l.project_id)) lastLogMap.set(l.project_id, l);
      }

      let md = `# Open Projects\n\nExported: ${today()}\n\n`;
      for (const p of (projects || [])) {
        const amount = p.amount ? `${Math.round(parseFloat(p.amount) / 1000)}K` : '-';
        md += `## ${p.title} (${p.status}, ${amount})\n`;
        if (p.contacts) md += `- Contact: ${p.contacts.first_name} ${p.contacts.last_name}\n`;
        if (p.companies?.name) md += `- Company: ${p.companies.name}\n`;
        if (p.expected_close) md += `- Expected close: ${p.expected_close}\n`;
        const last = lastLogMap.get(p.id);
        if (last) md += `- Last log (${last.logged_at}): ${last.content}\n`;
        md += '\n';
      }

      download(`projects-open-${today()}.md`, md, 'text/markdown');
      status.textContent = 'Done';
      status.style.color = 'var(--success)';
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      status.style.color = 'var(--danger)';
    } finally {
      btn.disabled = false;
    }
  });
}

// ── UI Kit tab ──

function renderUIKit(container) {
  const swatch = (varName, label) =>
    `<div style="display:flex;align-items:center;gap:8px">
      <span style="width:20px;height:20px;border-radius:4px;border:1px solid var(--border);background:var(${varName})"></span>
      <span>${label} <span class="muted">${varName}</span></span>
    </div>`;

  container.innerHTML = `
    <!-- COLORS -->
    <div class="section-bar">Colors — baseline tokens</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px 24px;padding:4px 0;margin-bottom:12px">
      ${swatch('--text', 'Text')}
      ${swatch('--text-secondary', 'Secondary text')}
      ${swatch('--muted', 'Muted')}
      ${swatch('--primary', 'Primary / links')}
      ${swatch('--primary-hover', 'Primary hover')}
      ${swatch('--success', 'Success')}
      ${swatch('--warning', 'Warning')}
      ${swatch('--danger', 'Danger')}
      ${swatch('--border', 'Border')}
      ${swatch('--border-strong', 'Border strong')}
      ${swatch('--surface-alt', 'Surface alt (hover)')}
    </div>

    <!-- TYPOGRAPHY -->
    <div class="section-bar">Typography</div>
    <div style="padding:4px 0;margin-bottom:12px">
      <div class="muted" style="margin-bottom:4px">System sans-serif, 14px base, line-height 1.5.</div>
      <div style="color:var(--text)">Primary text (--text)</div>
      <div style="color:var(--text-secondary)">Secondary text (--text-secondary)</div>
      <div style="color:var(--muted)">Muted text (--muted)</div>
      <h1>h1 — 18px, semibold</h1>
      <h2>h2 — 16px, semibold</h2>
      <h3>h3 — 14px, semibold</h3>
    </div>

    <!-- BUTTONS -->
    <div class="section-bar">Buttons</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 0;margin-bottom:12px">
      <button class="btn">.btn</button>
      <button class="btn btn-primary">.btn-primary</button>
      <button class="btn btn-secondary">.btn-secondary</button>
      <button class="btn btn-danger">.btn-danger</button>
      <button class="btn btn-sm">.btn-sm</button>
      <button class="btn btn-sm btn-primary">.btn-sm.btn-primary</button>
      <a href="#" class="btn-back">.btn-back</a>
    </div>

    <!-- INPUTS -->
    <div class="section-bar">Inputs</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:4px 0;margin-bottom:12px">
      <input class="input" placeholder="text input" style="width:160px">
      <input class="input" type="search" placeholder="search" style="width:160px">
      <select class="input"><option>select.input</option><option>option 2</option></select>
      <input class="input input-error" value="input-error" style="width:160px">
    </div>
    <div style="padding:4px 0;margin-bottom:12px">
      <textarea class="input" rows="2" style="width:100%;max-width:400px" placeholder="textarea.input"></textarea>
    </div>
    <div style="padding:4px 0;margin-bottom:12px">
      <div style="color:var(--dgray);margin-bottom:2px">Inline input (transparent until focus):</div>
      <input class="inline-input" value="inline-input" style="width:200px">
    </div>

    <!-- LINKS -->
    <div class="section-bar">Links</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;padding:4px 0;margin-bottom:12px">
      <a href="#">default link</a>
      <span class="muted"><a href="#" class="muted">muted link</a></span>
      <a href="#" class="danger-link">danger-link</a>
    </div>
    <div class="muted" style="padding:2px 0;margin-bottom:12px">Hover = darker color + underline</div>

    <!-- TABLE -->
    <div class="section-bar">Table (.data-table)</div>
    <div style="padding:4px 0;margin-bottom:12px">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
        <tbody>
          <tr class="clickable-row"><td>Sample record</td><td><span class="status-badge status-open">open</span></td><td>50K</td><td class="actions-cell"><a href="#">edit</a> <a href="#" class="danger-link">del</a></td></tr>
          <tr class="clickable-row"><td>Another record</td><td><span class="status-badge status-frozen">frozen</span></td><td>120K</td><td class="actions-cell"><a href="#">edit</a> <a href="#" class="danger-link">del</a></td></tr>
          <tr class="clickable-row"><td>Third record</td><td><span class="status-badge status-won">won</span></td><td>80K</td><td class="actions-cell"><a href="#">edit</a> <a href="#" class="danger-link">del</a></td></tr>
        </tbody>
      </table>
    </div>

    <!-- STATUS BADGES -->
    <div class="section-bar">Status badges</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;padding:4px 0;margin-bottom:12px">
      <span class="status-badge status-open">open</span>
      <span class="status-badge status-frozen">frozen</span>
      <span class="status-badge status-won">won</span>
      <span class="status-badge status-lost">lost</span>
      <span class="badge">(3)</span>
      <span class="incomplete-badge">incomplete</span>
    </div>

    <!-- FORM LAYOUT -->
    <div class="section-bar">Form layout</div>
    <div class="form-card" style="margin-bottom:12px">
      <div class="form-row">
        <div class="form-group">
          <label>First name</label>
          <input class="input" value="Jan" style="width:100%">
        </div>
        <div class="form-group">
          <label>Last name</label>
          <input class="input" value="Novák" style="width:100%">
        </div>
      </div>
      <div class="form-group">
        <div class="label-with-action"><label>Email</label><a href="#" class="muted">verify</a></div>
        <input class="input" value="jan@example.com" style="width:100%">
      </div>
      <div class="form-actions">
        <button class="btn btn-primary">Save</button>
        <a href="#" class="btn-back">Cancel</a>
      </div>
      <div class="form-error">form-error message</div>
    </div>

    <!-- LOG TIMELINE -->
    <div class="section-bar">Log timeline</div>
    <div class="log-timeline" style="margin-bottom:12px">
      <div class="log-entry log-entry-next">
        <div class="log-entry-view">
          <span class="log-date">30.06.2026</span>
          <span class="log-content">Next step — follow up on proposal</span>
          <span class="log-tag">project-x</span>
          <span class="log-actions"><button class="log-edit-btn">ed</button><button class="log-delete-btn">×</button></span>
        </div>
      </div>
      <div class="log-entry log-entry-waiting">
        <div class="log-entry-view">
          <span class="log-date">28.06.2026</span>
          <span class="log-content">Waiting — client reviewing contract</span>
          <span class="log-tag">project-x</span>
          <span class="log-actions"><button class="log-edit-btn">ed</button><button class="log-delete-btn">×</button></span>
        </div>
      </div>
      <div class="log-entry">
        <div class="log-entry-view">
          <span class="log-date">25.06.2026</span>
          <span class="log-content">Regular log entry — discussed scope and timeline</span>
          <span class="log-tag">project-x</span>
          <span class="log-actions"><button class="log-edit-btn">ed</button><button class="log-delete-btn">×</button></span>
        </div>
      </div>
      <div class="log-empty">log-empty — no entries yet</div>
    </div>

    <!-- NEXT STEP / WAITING STEP -->
    <div class="section-bar">Next step / Waiting step</div>
    <div style="padding:4px 0;margin-bottom:12px">
      <div class="next-step">
        <span class="next-step-label">NEXT:</span> Send revised proposal by Friday
      </div>
      <div class="next-step waiting-step">
        <span class="waiting-step-label">WAITING:</span> Client to confirm budget
      </div>
    </div>

    <!-- PROGRESS BAR -->
    <div class="section-bar">Progress bar</div>
    <div style="padding:4px 0;margin-bottom:12px;display:flex;flex-direction:column;gap:8px;max-width:320px">
      <div class="progress-item"><div style="background:var(--surface-alt);border-radius:4px;overflow:hidden"><div class="progress-bar" style="width:50%"></div></div><span class="muted">50% — pipeline</span></div>
      <div class="progress-item"><div style="background:var(--surface-alt);border-radius:4px;overflow:hidden"><div class="progress-bar" style="width:75%"></div></div><span class="muted">75% — contacts</span></div>
      <div class="progress-item"><div style="background:var(--surface-alt);border-radius:4px;overflow:hidden"><div class="progress-bar" style="width:100%"></div></div><span class="muted">100% — done</span></div>
    </div>

    <!-- SECTION BARS & SEPARATORS -->
    <div class="section-bar">Section bars & separators</div>
    <div style="padding:4px 0;margin-bottom:12px">
      <div class="section-bar">section-bar</div>
      <div style="border-bottom:1px solid var(--border);padding:2px 0;margin-bottom:4px">1px solid --border</div>
    </div>

    <!-- TABS -->
    <div class="section-bar">Tabs (.extra-tab)</div>
    <div style="margin-bottom:12px">
      <div class="extra-tabs">
        <a href="#" class="extra-tab active" onclick="event.preventDefault()">Active tab</a>
        <a href="#" class="extra-tab" onclick="event.preventDefault()">Inactive tab</a>
        <a href="#" class="extra-tab" onclick="event.preventDefault()">Another tab</a>
      </div>
    </div>

    <!-- PAGE HEADER -->
    <div class="section-bar">Page header</div>
    <div style="margin-bottom:12px">
      <div class="page-header">
        <h1>Page title</h1>
        <div class="header-actions">
          <span class="header-meta">meta info</span>
          <button class="btn btn-primary">Action</button>
        </div>
      </div>
    </div>

    <!-- DETAIL TOOLBAR -->
    <div class="section-bar">Detail toolbar</div>
    <div style="margin-bottom:12px">
      <div class="detail-header">
        <div class="detail-toolbar">
          <a href="#" class="btn-back">&lt; Back</a>
          <h1>Record name</h1>
          <span class="badge">(open)</span>
          <div class="detail-actions">
            <button class="btn btn-sm">Edit</button>
            <button class="btn btn-sm btn-danger">Delete</button>
          </div>
        </div>
        <div class="compact-meta">Created 01.01.2026 · Company XYZ</div>
      </div>
    </div>

    <!-- STATES -->
    <div class="section-bar">States</div>
    <div style="padding:4px 0;margin-bottom:12px">
      <div class="loading">loading...</div>
      <div class="empty-state">empty-state — nothing here yet</div>
      <div class="error">error — something went wrong</div>
    </div>

    <!-- HOVER PATTERN -->
    <div class="section-bar">Hover pattern</div>
    <div style="padding:4px 0;margin-bottom:12px" class="muted">
      Interactive elements on hover: subtle surface-alt background (rows, buttons) or darker color + underline (links).
      <span style="display:inline-block;background:var(--surface-alt);color:var(--text);padding:2px 6px;border-radius:4px;margin-left:8px">like this</span>
    </div>

    <!-- SPACING -->
    <div class="section-bar">Spacing reference</div>
    <div style="padding:4px 0" class="muted">
      <div>Layout padding: 24–32px · Grid gap: 24px · Sidebar: 180px</div>
      <div>Section margin: 8–12px · Form gap: 12px · Button padding: 5px 12px</div>
      <div>Input padding: 5px 8px · Border-radius: 6px</div>
    </div>
  `;

  // Prevent all demo links from navigating
  container.querySelectorAll('a[href="#"]').forEach(a => {
    a.addEventListener('click', e => e.preventDefault());
  });
}

// ── Helpers ──

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
