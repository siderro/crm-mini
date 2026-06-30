import { sb } from '../supabase.js';

let cachedContacts = null;
let cachedProjects = null;
let stickyContactId = null;
let stickyProjectId = null;

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

// Invalidate cache when data changes
window.addEventListener('log-created', () => { cachedContacts = null; cachedProjects = null; });

export async function renderQuickEntry(container, context = {}) {
  if (!container) return;

  try {
    const { contacts, projects } = await loadData();

    // Context pre-fill overrides sticky
    if (context.contactId) stickyContactId = context.contactId;
    if (context.projectId) stickyProjectId = context.projectId;

    const contactName = stickyContactId
      ? (() => { const c = contacts.find(x => x.id === stickyContactId); return c ? `${c.first_name} ${c.last_name}` : ''; })()
      : '';
    const projectName = stickyProjectId
      ? (() => { const p = projects.find(x => x.id === stickyProjectId); return p ? p.title : ''; })()
      : '';

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
        <input type="text" id="qe-content" class="input qe-input" placeholder="what happened?  (> next step, ? waiting on them)" autocomplete="off">
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
    const statusEl = container.querySelector('#qe-status');

    // --- Autocomplete for contacts ---
    setupAutocomplete(contactInput, contactIdEl, contactList, contacts, c => `${c.first_name} ${c.last_name}`, 'id');

    // --- Autocomplete for projects ---
    setupAutocomplete(projectInput, projectIdEl, projectList, projects, p => p.title, 'id');

    // --- Save on Enter in content field ---
    contentEl.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await save(container);
      }
    });

    // Tab from contact → project, Tab from project → content
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
    container.innerHTML = '';
  }
}

function setupAutocomplete(input, hiddenInput, listEl, items, labelFn, idKey) {
  let activeIdx = -1;
  let filtered = [];

  function render(list) {
    filtered = list;
    activeIdx = -1;
    if (list.length === 0) {
      listEl.style.display = 'none';
      return;
    }
    listEl.innerHTML = list.slice(0, 6).map((item, i) =>
      `<div class="qe-ac-item" data-idx="${i}">${esc(labelFn(item))}</div>`
    ).join('');
    listEl.style.display = '';
  }

  function select(item) {
    input.value = labelFn(item);
    hiddenInput.value = item[idKey];
    listEl.style.display = 'none';
    filtered = [];
  }

  function setActive(idx) {
    const els = listEl.querySelectorAll('.qe-ac-item');
    els.forEach(el => el.classList.remove('qe-ac-active'));
    if (idx >= 0 && idx < els.length) {
      els[idx].classList.add('qe-ac-active');
      activeIdx = idx;
    } else {
      activeIdx = -1;
    }
  }

  input.addEventListener('input', () => {
    const q = normalize(input.value.trim());
    hiddenInput.value = ''; // clear selection when typing
    if (q.length === 0) {
      listEl.style.display = 'none';
      return;
    }
    const matches = items.filter(item => normalize(labelFn(item)).includes(q));
    render(matches);
  });

  input.addEventListener('keydown', (e) => {
    if (listEl.style.display === 'none' || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIdx + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIdx - 1, 0));
    } else if ((e.key === 'Enter' || e.key === 'Tab') && activeIdx >= 0) {
      e.preventDefault();
      select(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      listEl.style.display = 'none';
    }
  });

  listEl.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.qe-ac-item');
    if (!item) return;
    e.preventDefault();
    const idx = parseInt(item.dataset.idx);
    if (filtered[idx]) select(filtered[idx]);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { listEl.style.display = 'none'; }, 150);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim() && hiddenInput.value) return; // already selected
    const q = normalize(input.value.trim());
    if (q.length > 0) {
      const matches = items.filter(item => normalize(labelFn(item)).includes(q));
      render(matches);
    }
  });
}

async function save(container) {
  const contentEl = container.querySelector('#qe-content');
  const content = contentEl.value.trim();
  if (!content) return;

  const contactId = container.querySelector('#qe-contact-id').value || null;
  const projectId = container.querySelector('#qe-project-id').value || null;
  const statusEl = container.querySelector('#qe-status');
  const today = new Date().toISOString().slice(0, 10);

  const user = (await sb.auth.getUser()).data.user;
  if (!user) return;

  const { error } = await sb.from('logs').insert({
    user_id: user.id,
    content,
    contact_id: contactId,
    project_id: projectId,
    logged_at: today,
  });

  if (error) {
    statusEl.textContent = 'Error';
    statusEl.style.color = 'var(--danger)';
  } else {
    statusEl.textContent = 'Saved';
    statusEl.style.color = 'var(--success)';
    contentEl.value = '';
    // Sticky: remember contact/project for next entry
    stickyContactId = contactId;
    stickyProjectId = projectId;
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
    window.dispatchEvent(new CustomEvent('log-created'));
    contentEl.focus();
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
