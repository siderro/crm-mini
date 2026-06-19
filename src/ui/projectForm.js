import { sb } from '../supabase.js';

export async function renderProjectForm(container, id = null) {
  // Edit redirects to detail (inline edit)
  if (id) {
    window.location.hash = `#/projects/${id}`;
    return;
  }

  container.innerHTML = `
    <div class="form-page">
      <a href="#/projects" class="btn btn-back">&larr; Back</a>
      <h1>New Project</h1>

      <form id="project-form" class="card form-card" novalidate>
        <div class="form-group">
          <label for="title">Title *</label>
          <input type="text" id="title" class="input" required>
          <span class="field-error" id="err-title"></span>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="submit-btn">Save</button>
          <a href="#/projects" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="form-error"></div>
      </form>
    </div>
  `;

  container.querySelector('#title').focus();

  container.querySelector('#project-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = container.querySelector('#title').value.trim();
    if (!title) {
      const el = container.querySelector('#err-title');
      if (el) el.textContent = 'Required';
      return;
    }

    const btn = container.querySelector('#submit-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const user = (await sb.auth.getUser()).data.user;
      const { data, error } = await sb.from('projects')
        .insert({ title, status: 'open', user_id: user.id })
        .select().single();
      if (error) throw error;
      window.location.hash = `#/projects/${data.id}`;
    } catch (err) {
      container.querySelector('#form-error').textContent = 'Error: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}
