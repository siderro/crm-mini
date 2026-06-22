import { sb } from '../supabase.js';

export async function renderQuickEntry(container, context = {}) {
  if (!container) return;

  try {
    const [{ data: contacts }, { data: projects }] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('projects').select('id, title').order('title'),
    ]);

    const today = new Date().toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="qe-separator">${'─'.repeat(200)}</div>
      <div class="quick-entry">
        <input type="text" id="qe-content" class="input qe-input" placeholder="What happened? Start with > for next step">
        <select id="qe-contact" class="input qe-select">
          <option value="">-- contact --</option>
          ${(contacts || []).map(c => `<option value="${c.id}">${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
        </select>
        <select id="qe-project" class="input qe-select">
          <option value="">-- project --</option>
          ${(projects || []).map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
        </select>
        <input type="date" id="qe-date" class="input qe-date" value="${today}">
        <button id="qe-save" class="btn btn-sm btn-primary">Log</button>
        <span id="qe-status" class="qe-status"></span>
      </div>
    `;

    // Pre-fill from context
    if (context.contactId) {
      container.querySelector('#qe-contact').value = context.contactId;
    }
    if (context.projectId) {
      container.querySelector('#qe-project').value = context.projectId;
    }

    container.querySelector('#qe-save').addEventListener('click', async () => {
      const content = container.querySelector('#qe-content').value.trim();
      if (!content) return;

      const status = container.querySelector('#qe-status');
      const contactVal = container.querySelector('#qe-contact').value;
      const projectVal = container.querySelector('#qe-project').value;
      const dateVal = container.querySelector('#qe-date').value;

      if (!contactVal && !projectVal) {
        status.textContent = 'Select contact or project';
        status.style.color = 'var(--danger)';
        return;
      }

      const user = (await sb.auth.getUser()).data.user;
      if (!user) return;

      const { error } = await sb.from('logs').insert({
        user_id: user.id,
        content,
        contact_id: contactVal || null,
        project_id: projectVal || null,
        logged_at: dateVal || today,
      });

      if (error) {
        status.textContent = 'Error';
        status.style.color = 'var(--danger)';
      } else {
        status.textContent = 'Saved';
        status.style.color = 'var(--success)';
        container.querySelector('#qe-content').value = '';
        setTimeout(() => { status.textContent = ''; }, 2000);
        window.dispatchEvent(new CustomEvent('log-created'));
      }
    });

    // Submit on Enter
    container.querySelector('#qe-content').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        container.querySelector('#qe-save').click();
      }
    });

  } catch (err) {
    container.innerHTML = '';
  }
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
