import { sb } from '../supabase.js';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' }
];

export async function renderProjectForm(container, id = null) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const isEdit = !!id;
  let project = { title: '', amount: '', status: 'open', expected_close: '', contact_id: '', company_id: '', notes: '' };

  try {
    const [
      { data: contacts },
      { data: companies }
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('companies').select('id, name').order('name')
    ]);

    if (isEdit) {
      const { data, error } = await sb.from('projects').select('*').eq('id', id).single();
      if (error || !data) {
        container.innerHTML = '<div class="error">Project not found. <a href="#/projects">Back to list</a></div>';
        return;
      }
      project = data;
    }

    container.innerHTML = `
      <div class="form-page">
        <a href="${isEdit ? `#/projects/${id}` : '#/projects'}" class="btn btn-back">&larr; ${isEdit ? 'Back to project' : 'Back to list'}</a>
        <h1>${isEdit ? 'Edit Project' : 'New Project'}</h1>

        <form id="project-form" class="card form-card" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="title">Project Title *</label>
              <input type="text" id="title" class="input" value="${escapeAttr(project.title)}" required>
              <span class="field-error" id="err-title"></span>
            </div>
            <div class="form-group">
              <label for="amount">Amount</label>
              <input type="number" id="amount" class="input" value="${project.amount || ''}" step="0.01" placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="status">Status *</label>
              <select id="status" class="input" required>
                ${STATUS_OPTIONS.map(opt =>
                  `<option value="${opt.value}"${project.status === opt.value ? ' selected' : ''}>${opt.label}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="expected_close">Expected Close</label>
              <input type="date" id="expected_close" class="input" value="${project.expected_close || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="contact_id">Contact</label>
              <select id="contact_id" class="input">
                <option value="">-- None --</option>
                ${(contacts || []).map(c =>
                  `<option value="${c.id}"${project.contact_id === c.id ? ' selected' : ''}>${esc(c.first_name)} ${esc(c.last_name)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="company_id">Company</label>
              <select id="company_id" class="input">
                <option value="">-- None --</option>
                ${(companies || []).map(c =>
                  `<option value="${c.id}"${project.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" class="input" rows="4">${esc(project.notes || '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Save Changes' : 'Create Project'}</button>
            <a href="${isEdit ? `#/projects/${id}` : '#/projects'}" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="form-error"></div>
        </form>
      </div>
    `;

    container.querySelector('#project-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(container);

      const title = container.querySelector('#title').value.trim();
      const amount = container.querySelector('#amount').value;
      const status = container.querySelector('#status').value;
      const expectedClose = container.querySelector('#expected_close').value;
      const contactId = container.querySelector('#contact_id').value || null;
      const companyId = container.querySelector('#company_id').value || null;
      const notes = container.querySelector('#notes').value.trim();

      // Validate
      let valid = true;
      if (!title) {
        showFieldError(container, 'title', 'Project title is required');
        valid = false;
      }
      if (!valid) return;

      const btn = container.querySelector('#submit-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const payload = {
          title,
          amount: amount || null,
          status,
          expected_close: expectedClose || null,
          contact_id: contactId,
          company_id: companyId,
          notes: notes || null,
        };

        if (isEdit) {
          const { error } = await sb.from('projects').update(payload).eq('id', id);
          if (error) throw error;
          window.location.hash = `#/projects/${id}`;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { data, error } = await sb.from('projects').insert(payload).select().single();
          if (error) throw error;
          window.location.hash = `#/projects/${data.id}`;
        }
      } catch (err) {
        container.querySelector('#form-error').textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.textContent = isEdit ? 'Save Changes' : 'Create Project';
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function showFieldError(container, field, msg) {
  const el = container.querySelector(`#err-${field}`);
  if (el) el.textContent = msg;
  const input = container.querySelector(`#${field}`);
  if (input) input.classList.add('input-error');
}

function clearErrors(container) {
  container.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  container.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  container.querySelector('#form-error').textContent = '';
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
