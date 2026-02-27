import { sb } from '../supabase.js';

export async function renderCompanies(container) {
  container.innerHTML = '<div class="loading">Loading companies...</div>';

  try {
    const { data: companies, error } = await sb.from('companies')
      .select('*, contacts(id)')
      .order('name');

    if (error) throw error;

    const list = companies || [];

    container.innerHTML = `
      <div class="page-header">
        <h1>Companies <span class="badge">${list.length}</span></h1>
        <div class="header-actions">
          <a href="#/contacts" class="btn btn-secondary">&larr; Contacts</a>
          <button id="add-company-btn" class="btn btn-primary">+ New Company</button>
        </div>
      </div>

      <div id="company-form-wrap" class="card form-card" style="display:none">
        <h2 id="company-form-title">New Company</h2>
        <form id="company-form">
          <input type="hidden" id="company-edit-id" value="">
          <div class="form-row">
            <div class="form-group">
              <label for="c-name">Company Name *</label>
              <input type="text" id="c-name" class="input" required>
            </div>
            <div class="form-group">
              <label for="c-email">Email</label>
              <input type="email" id="c-email" class="input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="c-ico">Company ID (ICO)</label>
              <input type="text" id="c-ico" class="input" maxlength="20">
            </div>
            <div class="form-group">
              <label for="c-web">Website</label>
              <input type="url" id="c-web" class="input" placeholder="https://...">
            </div>
          </div>
          <div class="form-group">
            <label for="c-notes">Notes</label>
            <textarea id="c-notes" class="input" rows="3"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="company-submit-btn">Create Company</button>
            <button type="button" id="company-cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
          <div class="form-error" id="company-form-error"></div>
        </form>
      </div>

      ${list.length === 0
        ? '<div class="empty-state">No companies yet.</div>'
        : `<div class="table-wrap"><table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Website</th>
            <th>ICO</th>
            <th>Contacts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(c => `
            <tr>
              <td><strong>${esc(c.name)}</strong></td>
              <td>${c.email ? esc(c.email) : '<span class="muted">-</span>'}</td>
              <td>${c.web ? `<a href="${escapeAttr(c.web)}" target="_blank" rel="noopener">${esc(c.web)}</a>` : '<span class="muted">-</span>'}</td>
              <td>${c.ico ? esc(c.ico) : '<span class="muted">-</span>'}</td>
              <td>${c.contacts ? c.contacts.length : 0}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-secondary edit-company" data-id="${c.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-company" data-id="${c.id}" data-name="${escapeAttr(c.name)}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>`}
    `;

    const formWrap = container.querySelector('#company-form-wrap');
    const form = container.querySelector('#company-form');

    function showForm(company = null) {
      formWrap.style.display = '';
      container.querySelector('#company-form-title').textContent = company ? 'Edit Company' : 'New Company';
      container.querySelector('#company-submit-btn').textContent = company ? 'Save Changes' : 'Create Company';
      container.querySelector('#company-edit-id').value = company?.id || '';
      container.querySelector('#c-name').value = company?.name || '';
      container.querySelector('#c-email').value = company?.email || '';
      container.querySelector('#c-ico').value = company?.ico || '';
      container.querySelector('#c-web').value = company?.web || '';
      container.querySelector('#c-notes').value = company?.notes || '';
      container.querySelector('#c-name').focus();
    }

    function hideForm() {
      formWrap.style.display = 'none';
      form.reset();
      container.querySelector('#company-edit-id').value = '';
      container.querySelector('#company-form-error').textContent = '';
    }

    container.querySelector('#add-company-btn').addEventListener('click', () => showForm());
    container.querySelector('#company-cancel-btn').addEventListener('click', hideForm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = container.querySelector('#c-name').value.trim();
      if (!name) { container.querySelector('#company-form-error').textContent = 'Company name is required'; return; }

      const editId = container.querySelector('#company-edit-id').value;
      const payload = {
        name,
        email: container.querySelector('#c-email').value.trim() || null,
        ico: container.querySelector('#c-ico').value.trim() || null,
        web: container.querySelector('#c-web').value.trim() || null,
        notes: container.querySelector('#c-notes').value.trim() || null,
      };

      try {
        if (editId) {
          const { error } = await sb.from('companies').update(payload).eq('id', editId);
          if (error) throw error;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { error } = await sb.from('companies').insert(payload);
          if (error) throw error;
        }
        await renderCompanies(container);
      } catch (err) {
        container.querySelector('#company-form-error').textContent = 'Error: ' + err.message;
      }
    });

    // Edit buttons
    container.querySelectorAll('.edit-company').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = list.find(x => x.id === btn.dataset.id);
        if (c) showForm(c);
      });
    });

    // Delete buttons
    container.querySelectorAll('.delete-company').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete company "${btn.dataset.name}"?`)) return;
        const { error } = await sb.from('companies').delete().eq('id', btn.dataset.id);
        if (error) { alert('Error: ' + error.message); return; }
        await renderCompanies(container);
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
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
