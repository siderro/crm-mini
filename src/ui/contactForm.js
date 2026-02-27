import { sb } from '../supabase.js';

export async function renderContactForm(container, id = null) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const isEdit = !!id;
  let contact = { first_name: '', last_name: '', email: '', phone: '', notes: '', company_id: '' };

  try {
    const { data: companies } = await sb.from('companies').select('id, name').order('name');

    if (isEdit) {
      const { data, error } = await sb.from('contacts').select('*').eq('id', id).single();
      if (error || !data) {
        container.innerHTML = '<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';
        return;
      }
      contact = data;
    }

    container.innerHTML = `
      <div class="form-page">
        <a href="${isEdit ? `#/contacts/${id}` : '#/contacts'}" class="btn btn-back">&larr; ${isEdit ? 'Back to contact' : 'Back to list'}</a>
        <h1>${isEdit ? 'Edit Contact' : 'New Contact'}</h1>

        <form id="contact-form" class="card form-card" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="first_name">First Name *</label>
              <input type="text" id="first_name" class="input" value="${escapeAttr(contact.first_name)}" required>
              <span class="field-error" id="err-first_name"></span>
            </div>
            <div class="form-group">
              <label for="last_name">Last Name *</label>
              <input type="text" id="last_name" class="input" value="${escapeAttr(contact.last_name)}" required>
              <span class="field-error" id="err-last_name"></span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" class="input" value="${escapeAttr(contact.email || '')}">
              <span class="field-error" id="err-email"></span>
            </div>
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" class="input" value="${escapeAttr(contact.phone || '')}">
            </div>
          </div>
          <div class="form-group">
            <label for="company_id">Company</label>
            <select id="company_id" class="input">
              <option value="">No company</option>
              ${(companies || []).map(c =>
                `<option value="${c.id}"${contact.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" class="input" rows="4">${esc(contact.notes || '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Save Changes' : 'Create Contact'}</button>
            <a href="${isEdit ? `#/contacts/${id}` : '#/contacts'}" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="form-error"></div>
        </form>
      </div>
    `;

    container.querySelector('#contact-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(container);

      const firstName = container.querySelector('#first_name').value.trim();
      const lastName = container.querySelector('#last_name').value.trim();
      const email = container.querySelector('#email').value.trim();
      const phone = container.querySelector('#phone').value.trim();
      const companyId = container.querySelector('#company_id').value || null;
      const notes = container.querySelector('#notes').value.trim();

      // Validate
      let valid = true;
      if (!firstName) {
        showFieldError(container, 'first_name', 'First name is required');
        valid = false;
      }
      if (!lastName) {
        showFieldError(container, 'last_name', 'Last name is required');
        valid = false;
      }
      if (email && !isValidEmail(email)) {
        showFieldError(container, 'email', 'Invalid email format');
        valid = false;
      }
      if (!valid) return;

      const btn = container.querySelector('#submit-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const payload = {
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: phone || null,
          company_id: companyId,
          notes: notes || null,
        };

        if (isEdit) {
          const { error } = await sb.from('contacts').update(payload).eq('id', id);
          if (error) throw error;
          window.location.hash = `#/contacts/${id}`;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { data, error } = await sb.from('contacts').insert(payload).select().single();
          if (error) throw error;
          window.location.hash = `#/contacts/${data.id}`;
        }
      } catch (err) {
        container.querySelector('#form-error').textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.textContent = isEdit ? 'Save Changes' : 'Create Contact';
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
