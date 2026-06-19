import { sb } from '../supabase.js';

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
        <a href="#" class="extra-tab${activeTab === 'export' ? ' active' : ''}" data-tab="export">Export</a>
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
    } else if (activeTab === 'export') {
      await renderExport(content, user);
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
