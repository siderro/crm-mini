import { sb } from '../supabase.js';

export async function renderCombo(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: contacts },
      { data: companies },
      { data: projects },
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('companies').select('id, name').order('name'),
      sb.from('projects').select('id, title').order('title'),
    ]);

    container.innerHTML = `
      <div class="form-page">
        <h1>New Record</h1>

        <form id="combo-form" class="card form-card" novalidate>
          <div class="form-group">
            <label for="c-pick">Contact</label>
            <div class="combo-or-new">
              <select id="c-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(contacts || []).map(c => `<option value="${c.id}">${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
              </select>
              <span class="muted">or new:</span>
              <input type="text" id="c-first" class="input" placeholder="first name">
              <input type="text" id="c-last" class="input" placeholder="last name">
            </div>
            <span class="field-error" id="err-c-contact"></span>
          </div>
          <div class="form-group">
            <label for="co-pick">Company</label>
            <div class="combo-or-new">
              <select id="co-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(companies || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
              </select>
              <span class="muted">or</span>
              <input type="text" id="co-new" class="input" placeholder="new company name">
            </div>
          </div>
          <div class="form-group">
            <label for="p-pick">Project</label>
            <div class="combo-or-new">
              <select id="p-pick" class="input">
                <option value="">-- pick existing --</option>
                ${(projects || []).map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
              </select>
              <span class="muted">or</span>
              <input type="text" id="p-new" class="input" placeholder="new project title">
            </div>
          </div>
          <div class="form-group">
            <label for="c-log">First log entry</label>
            <textarea id="c-log" class="input" rows="2" placeholder="What happened? > next step, ? waiting on them"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="combo-submit">Save</button>
            <a href="#/" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="combo-error"></div>
        </form>
      </div>
    `;

    // Clear select when typing new, clear inputs when selecting existing
    container.querySelector('#c-pick').addEventListener('change', () => {
      if (container.querySelector('#c-pick').value) {
        container.querySelector('#c-first').value = '';
        container.querySelector('#c-last').value = '';
      }
    });
    container.querySelector('#c-first').addEventListener('input', () => {
      if (container.querySelector('#c-first').value) container.querySelector('#c-pick').value = '';
    });
    container.querySelector('#c-last').addEventListener('input', () => {
      if (container.querySelector('#c-last').value) container.querySelector('#c-pick').value = '';
    });
    container.querySelector('#co-pick').addEventListener('change', () => {
      if (container.querySelector('#co-pick').value) container.querySelector('#co-new').value = '';
    });
    container.querySelector('#co-new').addEventListener('input', () => {
      if (container.querySelector('#co-new').value) container.querySelector('#co-pick').value = '';
    });
    container.querySelector('#p-pick').addEventListener('change', () => {
      if (container.querySelector('#p-pick').value) container.querySelector('#p-new').value = '';
    });
    container.querySelector('#p-new').addEventListener('input', () => {
      if (container.querySelector('#p-new').value) container.querySelector('#p-pick').value = '';
    });

    container.querySelector('#combo-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(container);

      const existingContactId = container.querySelector('#c-pick').value;
      const first = container.querySelector('#c-first').value.trim();
      const last = container.querySelector('#c-last').value.trim();
      if (!existingContactId && (!first || !last)) {
        showFieldError(container, 'c-contact', 'Pick existing or enter first + last name');
        return;
      }

      const btn = container.querySelector('#combo-submit');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const user = (await sb.auth.getUser()).data.user;
        let companyId = container.querySelector('#co-pick').value || null;
        let projectId = container.querySelector('#p-pick').value || null;

        // Create company if new name typed
        const coNew = container.querySelector('#co-new').value.trim();
        if (coNew && !companyId) {
          const { data, error } = await sb.from('companies')
            .insert({ name: coNew, user_id: user.id }).select().single();
          if (error) throw error;
          companyId = data.id;
        }

        // Contact: existing or new
        let contact;
        if (existingContactId) {
          const { data } = await sb.from('contacts').select('id').eq('id', existingContactId).single();
          contact = data;
          // Link company if selected
          if (companyId) await sb.from('contacts').update({ company_id: companyId }).eq('id', existingContactId);
        } else {
          const { data, error: cErr } = await sb.from('contacts')
            .insert({ first_name: first, last_name: last, company_id: companyId, user_id: user.id })
            .select().single();
          if (cErr) throw cErr;
          contact = data;
        }

        // Create project if new title typed
        const pNew = container.querySelector('#p-new').value.trim();
        if (pNew && !projectId) {
          const { data, error } = await sb.from('projects')
            .insert({ title: pNew, status: 'open', contact_id: contact.id, company_id: companyId, user_id: user.id })
            .select().single();
          if (error) throw error;
          projectId = data.id;
        } else if (projectId) {
          // Link existing project to new contact
          await sb.from('projects').update({ contact_id: contact.id, company_id: companyId || undefined }).eq('id', projectId);
        }

        // Create first log entry if provided
        const logText = container.querySelector('#c-log').value.trim();
        if (logText) {
          await sb.from('logs').insert({
            user_id: user.id,
            contact_id: contact.id,
            project_id: projectId || null,
            content: logText,
            logged_at: new Date().toISOString().slice(0, 10),
          });
        }

        window.location.hash = `#/contacts/${contact.id}`;

      } catch (err) {
        container.querySelector('#combo-error').textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.textContent = 'Save';
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function showFieldError(container, field, msg) {
  const el = container.querySelector(`#err-${field}`);
  if (el) el.textContent = msg;
}

function clearErrors(container) {
  container.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  container.querySelector('#combo-error').textContent = '';
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
