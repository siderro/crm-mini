import { sb } from '../supabase.js';

export async function renderContactForm(container, id = null) {
  // Edit redirects to detail (inline edit)
  if (id) {
    window.location.hash = `#/contacts/${id}`;
    return;
  }

  container.innerHTML = `
    <div class="form-page">
      <a href="#/contacts" class="btn btn-back">&larr; Back</a>
      <h1>New Contact</h1>

      <form id="contact-form" class="card form-card" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="first_name">First Name *</label>
            <input type="text" id="first_name" class="input" required>
            <span class="field-error" id="err-first_name"></span>
          </div>
          <div class="form-group">
            <label for="last_name">Last Name *</label>
            <input type="text" id="last_name" class="input" required>
            <span class="field-error" id="err-last_name"></span>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">Save</button>
          <a href="#/contacts" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="form-error"></div>
      </form>
    </div>
  `;

  container.querySelector('#first_name').focus();

  container.querySelector('#contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(container);

    const firstName = container.querySelector('#first_name').value.trim();
    const lastName = container.querySelector('#last_name').value.trim();

    let valid = true;
    if (!firstName) { showFieldError(container, 'first_name', 'Required'); valid = false; }
    if (!lastName) { showFieldError(container, 'last_name', 'Required'); valid = false; }
    if (!valid) return;

    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const user = (await sb.auth.getUser()).data.user;
      const { data, error } = await sb.from('contacts')
        .insert({ first_name: firstName, last_name: lastName, user_id: user.id })
        .select().single();
      if (error) throw error;
      window.location.hash = `#/contacts/${data.id}`;
    } catch (err) {
      container.querySelector('#form-error').textContent = 'Error: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
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
