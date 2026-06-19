import { sb } from '../supabase.js';

export async function renderCompanyForm(container, id = null) {
  // Edit redirects to detail (inline edit)
  if (id) {
    window.location.hash = `#/companies/${id}`;
    return;
  }

  container.innerHTML = `
    <div class="form-page">
      <a href="#/companies" class="btn btn-back">&larr; Back</a>
      <h1>New Company</h1>

      <form id="company-form" class="card form-card" novalidate>
        <div class="form-group">
          <label for="name">Company Name *</label>
          <input type="text" id="name" class="input" required>
          <span class="field-error" id="err-name"></span>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">Save</button>
          <a href="#/companies" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="form-error"></div>
      </form>
    </div>
  `;

  container.querySelector('#name').focus();

  container.querySelector('#company-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#name').value.trim();
    if (!name) {
      const el = container.querySelector('#err-name');
      if (el) el.textContent = 'Required';
      return;
    }

    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const user = (await sb.auth.getUser()).data.user;
      const { data, error } = await sb.from('companies')
        .insert({ name, user_id: user.id })
        .select().single();
      if (error) throw error;
      window.location.hash = `#/companies/${data.id}`;
    } catch (err) {
      container.querySelector('#form-error').textContent = 'Error: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}
