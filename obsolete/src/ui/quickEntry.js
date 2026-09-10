import { sb } from '../supabase.js';

let cachedContacts = null;
let cachedProjects = null;
let stickyContactId = null;
let stickyProjectId = null;
let currentMode = 'note'; // note | next | waiting

// Track "create new" state
let newContactName = null; // { first, last } if creating new
let newProjectTitle = null; // string if creating new

window.addEventListener('log-created', () => { cachedContacts = null; cachedProjects = null; });

async function loadData() {
  if (!cachedContacts || !cachedProjects) {
    const [{ data: contacts }, { data: projects }] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('projects').select('id, title').eq('status', 'open').order('title'),
    ]);
    cachedContacts = contacts || [];
    cachedProjects = projects || [];
  }
  return { contacts: cachedContacts, projects: cachedProjects };
}

export async function renderQuickEntry(container, context = {}) {
  if (!container) return;

  try {
    const { contacts, projects } = await loadData();

    if (context.contactId) stickyContactId = context.contactId;
    if (context.projectId) stickyProjectId = context.projectId;

    // Reset create-new state
    newContactName = null;
    newProjectTitle = null;

    const contactName = stickyContactId
      ? (() => { const c = contacts.find(x => x.id === stickyContactId); return c ? `${c.first_name} ${c.last_name}` : ''; })()
      : '';
    const projectName = stickyProjectId
      ? (() => { const p = projects.find(x => x.id === stickyProjectId); return p ? p.title : ''; })()
      : '';

    const placeholders = { note: 'what happened?', next: 'what needs to happen next?', waiting: 'what are you waiting for?' };

    container.innerHTML = `
      <div class="quick-entry">
        <div class="qe-ac-wrap">
          <input type="text" id="qe-contact" class="input qe-ac-input" placeholder="contact" value="${esc(contactName)}" autocomplete="off">
          <input type="hidden" id="qe-contact-id" value="${stickyContactId || ''}">
          <div class="qe-ac-list" id="qe-contact-list"></div>
        </div>
        <div class="qe-ac-wrap">
          <input type="text" id="qe-project" class="input qe-ac-input" placeholder="project" value="${esc(projectName)}" autocomplete="off">
          <input type="hidden" id="qe-project-id" value="${stickyProjectId || ''}">
          <div class="qe-ac-list" id="qe-project-list"></div>
        </div>
        <div class="qe-mode-toggle">
          <button class="qe-mode-btn${currentMode === 'note' ? ' active' : ''}" data-mode="note">Note</button>
          <button class="qe-mode-btn${currentMode === 'next' ? ' active' : ''}" data-mode="next">&gt; Next</button>
          <button class="qe-mode-btn${currentMode === 'waiting' ? ' active' : ''}" data-mode="waiting">? Wait</button>
        </div>
        <input type="text" id="qe-content" class="input qe-input" placeholder="${placeholders[currentMode]}" autocomplete="off">
        <span id="qe-status" class="qe-status"></span>
      </div>
    `;

    const contentEl = container.querySelector('#qe-content');
    const contactInput = container.querySelector('#qe-contact');
    const contactIdEl = container.querySelector('#qe-contact-id');
    const contactList = container.querySelector('#qe-contact-list');
    const projectInput = container.querySelector('#qe-project');
    const projectIdEl = container.querySelector('#qe-project-id');
    const projectList = container.querySelector('#qe-project-list');

    // Mode toggle
    container.querySelectorAll('.qe-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentMode = btn.dataset.mode;
        container.querySelectorAll('.qe-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contentEl.placeholder = placeholders[currentMode];
        contentEl.focus();
      });
    });

    // Contact autocomplete with "create new" option
    setupAutocomplete(contactInput, contactIdEl, contactList, contacts,
      c => `${c.first_name} ${c.last_name}`, 'id',
      {
        onCreateNew: (text) => {
          if (!text) { newContactName = null; return; }
          const parts = text.trim().split(/\s+/);
          newContactName = { first: parts[0] || '', last: parts.slice(1).join(' ') || '' };
          contactIdEl.value = '';
        },
        createLabel: (text) => `+ "${text}"`,
      }
    );

    // Project autocomplete with "create new" option
    setupAutocomplete(projectInput, projectIdEl, projectList, projects,
      p => p.title, 'id',
      {
        onCreateNew: (text) => {
          if (!text) { newProjectTitle = null; return; }
          newProjectTitle = text.trim();
          projectIdEl.value = '';
        },
        createLabel: (text) => `+ "${text}"`,
      }
    );

    // Save on Enter
    contentEl.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await save(container);
      }
    });

    // Tab flow
    contactInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !contactList.querySelector('.qe-ac-item.qe-ac-active')) {
        e.preventDefault();
        projectInput.focus();
      }
    });
    projectInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !projectList.querySelector('.qe-ac-item.qe-ac-active')) {
        e.preventDefault();
        contentEl.focus();
      }
    });

  } catch (err) {
    console.error('QuickEntry error:', err);
    container.innerHTML = '';
  }
}

function setupAutocomplete(input, hiddenInput, listEl, items, labelFn, idKey, opts = {}) {
  let activeIdx = -1;
  let filtered = [];
  let createNewItem = null;

  function render(list, rawQuery) {
    filtered = list;
    createNewItem = null;
    activeIdx = -1;

    const hasExactMatch = list.some(item => normalize(labelFn(item)) === normalize(rawQuery));

    // Build items HTML
    let html = list.slice(0, 5).map((item, i) =>
      `<div class="qe-ac-item" data-idx="${i}">${esc(labelFn(item))}</div>`
    ).join('');

    // Add "create new" option if query doesn't match exactly
    if (rawQuery.length > 0 && !hasExactMatch && opts.onCreateNew) {
      createNewItem = rawQuery;
      const createIdx = Math.min(list.length, 5);
      html += `<div class="qe-ac-item qe-ac-create" data-idx="${createIdx}">${opts.createLabel(rawQuery)}</div>`;
    }

    if (!html) { listEl.style.display = 'none'; return; }
    listEl.innerHTML = html;
    listEl.style.display = 'block';
  }

  function select(item) {
    input.value = labelFn(item);
    hiddenInput.value = item[idKey];
    if (opts.onCreateNew) { /* clear create-new state when selecting existing */ }
    listEl.style.display = 'none';
    filtered = [];
    createNewItem = null;
  }

  function selectCreateNew(text) {
    input.value = text;
    hiddenInput.value = '';
    opts.onCreateNew(text);
    listEl.style.display = 'none';
    filtered = [];
    createNewItem = null;
  }

  function setActive(idx) {
    const els = listEl.querySelectorAll('.qe-ac-item');
    const maxIdx = els.length - 1;
    els.forEach(el => el.classList.remove('qe-ac-active'));
    if (idx >= 0 && idx <= maxIdx) { els[idx].classList.add('qe-ac-active'); activeIdx = idx; }
    else { activeIdx = -1; }
  }

  function getMaxIdx() {
    return listEl.querySelectorAll('.qe-ac-item').length - 1;
  }

  input.addEventListener('input', () => {
    const raw = input.value.trim();
    const q = normalize(raw);
    hiddenInput.value = '';
    if (opts.onCreateNew) opts.onCreateNew(null);

    if (raw.length === 0) { listEl.style.display = 'none'; return; }
    const matches = items.filter(item => normalize(labelFn(item)).includes(q));
    render(matches, raw);
  });

  input.addEventListener('keydown', (e) => {
    if (listEl.style.display === 'none') return;
    const maxIdx = getMaxIdx();
    if (maxIdx < 0) return;

    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, maxIdx)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && activeIdx >= 0) {
      e.preventDefault();
      const el = listEl.querySelectorAll('.qe-ac-item')[activeIdx];
      if (el && el.classList.contains('qe-ac-create') && createNewItem) {
        selectCreateNew(createNewItem);
      } else if (filtered[activeIdx]) {
        select(filtered[activeIdx]);
      }
    } else if (e.key === 'Escape') { listEl.style.display = 'none'; }
  });

  listEl.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.qe-ac-item');
    if (!item) return;
    e.preventDefault();
    const idx = parseInt(item.dataset.idx);
    if (item.classList.contains('qe-ac-create') && createNewItem) {
      selectCreateNew(createNewItem);
    } else if (filtered[idx]) {
      select(filtered[idx]);
    }
  });

  input.addEventListener('blur', () => { setTimeout(() => { listEl.style.display = 'none'; }, 150); });

  input.addEventListener('focus', () => {
    if (input.value.trim() && hiddenInput.value) return;
    const raw = input.value.trim();
    if (raw.length > 0) {
      const matches = items.filter(item => normalize(labelFn(item)).includes(normalize(raw)));
      render(matches, raw);
    }
  });
}

async function save(container) {
  const contentEl = container.querySelector('#qe-content');
  let content = contentEl.value.trim();
  if (!content) return;

  if (currentMode === 'next') content = '>' + content;
  else if (currentMode === 'waiting') content = '?' + content;

  let contactId = container.querySelector('#qe-contact-id').value || null;
  let projectId = container.querySelector('#qe-project-id').value || null;
  const statusEl = container.querySelector('#qe-status');
  const today = new Date().toISOString().slice(0, 10);

  const user = (await sb.auth.getUser()).data.user;
  if (!user) return;

  try {
    // Create new contact if needed
    if (!contactId && newContactName && newContactName.first) {
      const { data, error } = await sb.from('contacts')
        .insert({ first_name: newContactName.first, last_name: newContactName.last || '', user_id: user.id })
        .select().single();
      if (error) throw error;
      contactId = data.id;
    }

    // Create new project if needed
    if (!projectId && newProjectTitle) {
      const { data, error } = await sb.from('projects')
        .insert({ title: newProjectTitle, status: 'open', contact_id: contactId, user_id: user.id })
        .select().single();
      if (error) throw error;
      projectId = data.id;
    }

    // Save log
    const { error } = await sb.from('logs').insert({
      user_id: user.id,
      content,
      contact_id: contactId,
      project_id: projectId,
      logged_at: today,
    });

    if (error) throw error;

    statusEl.textContent = 'Saved';
    statusEl.style.color = 'var(--success)';
    contentEl.value = '';
    stickyContactId = contactId;
    stickyProjectId = projectId;
    newContactName = null;
    newProjectTitle = null;
    currentMode = 'note';
    // Invalidate cache so new contact/project appears
    cachedContacts = null;
    cachedProjects = null;
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
    window.dispatchEvent(new CustomEvent('log-created'));
    contentEl.focus();

  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.style.color = 'var(--danger)';
  }
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
