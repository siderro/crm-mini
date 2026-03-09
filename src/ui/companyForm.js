import { sb } from '../supabase.js';

export async function renderCompanyForm(container, id = null) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const isEdit = !!id;
  let company = { name: '', official_name: '', email: '', ico: '', web: '', notes: '' };

  try {
    if (isEdit) {
      const { data, error } = await sb.from('companies').select('*').eq('id', id).single();
      if (error || !data) {
        container.innerHTML = '<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';
        return;
      }
      company = data;
    }

    container.innerHTML = `
      <div class="form-page">
        <a href="${isEdit ? `#/companies/${id}` : '#/companies'}" class="btn btn-back">&larr; ${isEdit ? 'Back to company' : 'Back to list'}</a>
        <h1>${isEdit ? 'Edit Company' : 'New Company'}</h1>

        <form id="company-form" class="card form-card" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="name">Company Name *</label>
              <input type="text" id="name" class="input" value="${escapeAttr(company.name)}" required>
              <span class="field-error" id="err-name"></span>
            </div>
            <div class="form-group">
              <label for="official_name">Official Name</label>
              <input type="text" id="official_name" class="input" value="${escapeAttr(company.official_name || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" class="input" value="${escapeAttr(company.email || '')}">
              <span class="field-error" id="err-email"></span>
            </div>
            <div class="form-group">
              <label for="ico">Company ID (ICO)</label>
              <input type="text" id="ico" class="input" value="${escapeAttr(company.ico || '')}" maxlength="20">
            </div>
          </div>
          <div class="form-group">
            <label for="web">Website</label>
            <input type="url" id="web" class="input" value="${escapeAttr(company.web || '')}" placeholder="https://...">
            <span class="field-error" id="err-web"></span>
          </div>
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" class="input" rows="4">${esc(company.notes || '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Save Changes' : 'Create Company'}</button>
            <a href="${isEdit ? `#/companies/${id}` : '#/companies'}" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="form-error"></div>
        </form>
      </div>
    `;

    container.querySelector('#company-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(container);

      const name = container.querySelector('#name').value.trim();
      const officialName = container.querySelector('#official_name').value.trim();
      const email = container.querySelector('#email').value.trim();
      const ico = container.querySelector('#ico').value.trim();
      const web = container.querySelector('#web').value.trim();
      const notes = container.querySelector('#notes').value.trim();

      // Validate
      let valid = true;
      if (!name) {
        showFieldError(container, 'name', 'Company name is required');
        valid = false;
      }
      if (email && !isValidEmail(email)) {
        showFieldError(container, 'email', 'Invalid email format');
        valid = false;
      }
      if (web && !isValidUrl(web)) {
        showFieldError(container, 'web', 'Invalid URL format');
        valid = false;
      }
      if (!valid) return;

      const btn = container.querySelector('#submit-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const payload = {
          name,
          official_name: officialName || null,
          email: email || null,
          ico: ico || null,
          web: web || null,
          notes: notes || null,
        };

        if (isEdit) {
          const { error } = await sb.from('companies').update(payload).eq('id', id);
          if (error) throw error;
          window.location.hash = `#/companies/${id}`;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { data, error } = await sb.from('companies').insert(payload).select().single();
          if (error) throw error;
          window.location.hash = `#/companies/${data.id}`;
        }
      } catch (err) {
        container.querySelector('#form-error').textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.textContent = isEdit ? 'Save Changes' : 'Create Company';
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

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidUrl(u) {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
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
