import { sb } from '../supabase.js';

export async function renderCombo(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: contacts },
      { data: companies },
      { data: projects }
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('companies').select('id, name').order('name'),
      sb.from('projects').select('id, title').order('title'),
    ]);

    container.innerHTML = `
      <div class="page-header">
        <h1>Add Combo</h1>
      </div>
      <form id="combo-form" novalidate>
        <div class="combo-grid">

          <div class="combo-col card">
            <div class="section-bar section-bar-contacts">Contact</div>
            <div class="combo-toggle">
              <a href="#" class="active" data-mode="new" data-group="contact">New</a>
              <a href="#" data-mode="existing" data-group="contact">Existing</a>
              <a href="#" data-mode="skip" data-group="contact">Skip</a>
            </div>
            <div id="contact-new-fields" class="combo-fields">
              <div class="form-group">
                <label for="c-first">First Name *</label>
                <input type="text" id="c-first" class="input">
                <span class="field-error" id="err-c-first"></span>
              </div>
              <div class="form-group">
                <label for="c-last">Last Name *</label>
                <input type="text" id="c-last" class="input">
                <span class="field-error" id="err-c-last"></span>
              </div>
              <div class="form-group">
                <label for="c-email">Email</label>
                <input type="email" id="c-email" class="input">
              </div>
              <div class="form-group">
                <label for="c-phone">Phone</label>
                <input type="tel" id="c-phone" class="input">
              </div>
              <div class="form-group">
                <div class="label-with-action">
                  <label for="c-notes">Notes</label>
                  <a href="#" class="add-timestamp" data-target="c-notes">Add timestamp</a>
                </div>
                <textarea id="c-notes" class="input" rows="4"></textarea>
              </div>
            </div>
            <div id="contact-existing-fields" class="combo-fields" style="display:none">
              <div class="form-group">
                <label for="c-existing">Select Contact</label>
                <select id="c-existing" class="input">
                  <option value="">-- Select --</option>
                  ${(contacts || []).map(c => `<option value="${c.id}">${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="combo-col card">
            <div class="section-bar section-bar-deals">Project</div>
            <div class="combo-toggle">
              <a href="#" class="active" data-mode="new" data-group="project">New</a>
              <a href="#" data-mode="existing" data-group="project">Existing</a>
              <a href="#" data-mode="skip" data-group="project">Skip</a>
            </div>
            <div id="project-new-fields" class="combo-fields">
              <div class="form-group">
                <label for="p-title">Title *</label>
                <input type="text" id="p-title" class="input">
                <span class="field-error" id="err-p-title"></span>
              </div>
              <div class="form-group">
                <label for="p-amount">Amount</label>
                <input type="number" id="p-amount" class="input" step="0.01" placeholder="0.00">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="p-status">Status</label>
                  <select id="p-status" class="input">
                    <option value="open">Open</option>
                    <option value="frozen">Frozen</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="p-expected">Expected Close</label>
                  <input type="date" id="p-expected" class="input">
                </div>
              </div>
              <div class="form-group">
                <div class="label-with-action">
                  <label for="p-notes">Notes</label>
                  <a href="#" class="add-timestamp" data-target="p-notes">Add timestamp</a>
                </div>
                <textarea id="p-notes" class="input" rows="4"></textarea>
              </div>
            </div>
            <div id="project-existing-fields" class="combo-fields" style="display:none">
              <div class="form-group">
                <label for="p-existing">Select Project</label>
                <select id="p-existing" class="input">
                  <option value="">-- Select --</option>
                  ${(projects || []).map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="combo-col card">
            <div class="section-bar section-bar-deals">Company</div>
            <div class="combo-toggle">
              <a href="#" data-mode="new" data-group="company">New</a>
              <a href="#" data-mode="existing" data-group="company">Existing</a>
              <a href="#" class="active" data-mode="skip" data-group="company">Skip</a>
            </div>
            <div id="company-new-fields" class="combo-fields" style="display:none">
              <div class="form-group">
                <label for="co-name">Company Name *</label>
                <input type="text" id="co-name" class="input">
                <span class="field-error" id="err-co-name"></span>
              </div>
              <div class="form-group">
                <label for="co-official">Official Name</label>
                <input type="text" id="co-official" class="input">
              </div>
              <div class="form-group">
                <label for="co-ico">IČO</label>
                <input type="text" id="co-ico" class="input" maxlength="20">
              </div>
              <div class="form-group">
                <label for="co-web">Website</label>
                <input type="url" id="co-web" class="input" placeholder="https://...">
              </div>
            </div>
            <div id="company-existing-fields" class="combo-fields" style="display:none">
              <div class="form-group">
                <label for="co-existing">Select Company</label>
                <select id="co-existing" class="input">
                  <option value="">-- Select --</option>
                  ${(companies || []).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

        </div>

        <div class="form-actions" style="margin-top:0.75rem;">
          <button type="submit" class="btn btn-primary" id="combo-submit">Save & Link</button>
          <a href="#/" class="btn btn-secondary">Cancel</a>
        </div>
        <div class="form-error" id="combo-error"></div>
      </form>
    `;

    // Mode state
    const modes = { contact: 'new', project: 'new', company: 'skip' };

    // Toggle new/existing/skip
    container.querySelectorAll('.combo-toggle a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const group = link.dataset.group;
        const mode = link.dataset.mode;
        modes[group] = mode;

        // Update active links
        container.querySelectorAll(`.combo-toggle a[data-group="${group}"]`).forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Show/hide fields
        const newFields = container.querySelector(`#${group}-new-fields`);
        const existingFields = container.querySelector(`#${group}-existing-fields`);
        if (newFields) newFields.style.display = mode === 'new' ? '' : 'none';
        if (existingFields) existingFields.style.display = mode === 'existing' ? '' : 'none';
      });
    });

    // Add timestamp links
    container.querySelectorAll('.add-timestamp').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const textarea = container.querySelector(`#${link.dataset.target}`);
        const date = new Date().toLocaleDateString('cs-CZ');
        const pos = textarea.selectionStart;
        const val = textarea.value;
        const stamp = (val && !val.substring(0, pos).endsWith('\n') ? '\n' : '') + `[${date}] `;
        textarea.value = val.slice(0, pos) + stamp + val.slice(pos);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = pos + stamp.length;
      });
    });

    // Submit
    container.querySelector('#combo-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(container);

      const btn = container.querySelector('#combo-submit');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const user = (await sb.auth.getUser()).data.user;
        let contactId = null;
        let companyId = null;
        let projectId = null;

        // 1. Company first
        if (modes.company === 'new') {
          const name = container.querySelector('#co-name').value.trim();
          if (!name) { showFieldError(container, 'co-name', 'Required'); throw new ValidationError(); }
          const { data, error } = await sb.from('companies').insert({
            user_id: user.id,
            name,
            official_name: container.querySelector('#co-official').value.trim() || null,
            ico: container.querySelector('#co-ico').value.trim() || null,
            web: container.querySelector('#co-web').value.trim() || null,
          }).select().single();
          if (error) throw error;
          companyId = data.id;
        } else if (modes.company === 'existing') {
          companyId = container.querySelector('#co-existing').value || null;
        }

        // 2. Contact
        if (modes.contact === 'new') {
          const first = container.querySelector('#c-first').value.trim();
          const last = container.querySelector('#c-last').value.trim();
          if (!first) { showFieldError(container, 'c-first', 'Required'); throw new ValidationError(); }
          if (!last) { showFieldError(container, 'c-last', 'Required'); throw new ValidationError(); }
          const { data, error } = await sb.from('contacts').insert({
            user_id: user.id,
            first_name: first,
            last_name: last,
            email: container.querySelector('#c-email').value.trim() || null,
            phone: container.querySelector('#c-phone').value.trim() || null,
            company_id: companyId,
            notes: container.querySelector('#c-notes').value.trim() || null,
          }).select().single();
          if (error) throw error;
          contactId = data.id;
        } else if (modes.contact === 'existing') {
          contactId = container.querySelector('#c-existing').value || null;
          if (contactId && companyId) {
            await sb.from('contacts').update({ company_id: companyId }).eq('id', contactId);
          }
        }

        // 3. Project
        if (modes.project === 'new') {
          const title = container.querySelector('#p-title').value.trim();
          if (!title) { showFieldError(container, 'p-title', 'Required'); throw new ValidationError(); }
          const { data, error } = await sb.from('projects').insert({
            user_id: user.id,
            title,
            amount: container.querySelector('#p-amount').value || null,
            status: container.querySelector('#p-status').value,
            expected_close: container.querySelector('#p-expected').value || null,
            contact_id: contactId,
            company_id: companyId,
            notes: container.querySelector('#p-notes').value.trim() || null,
          }).select().single();
          if (error) throw error;
          projectId = data.id;
        } else if (modes.project === 'existing') {
          projectId = container.querySelector('#p-existing').value || null;
          if (projectId) {
            const updates = {};
            if (contactId) updates.contact_id = contactId;
            if (companyId) updates.company_id = companyId;
            if (Object.keys(updates).length > 0) {
              await sb.from('projects').update(updates).eq('id', projectId);
            }
          }
        }

        // Navigate to the most relevant detail
        if (contactId) {
          window.location.hash = `#/contacts/${contactId}`;
        } else if (projectId) {
          window.location.hash = `#/projects/${projectId}`;
        } else if (companyId) {
          window.location.hash = `#/companies/${companyId}`;
        } else {
          window.location.hash = '#/';
        }

      } catch (err) {
        if (!(err instanceof ValidationError)) {
          container.querySelector('#combo-error').textContent = 'Error: ' + err.message;
        }
        btn.disabled = false;
        btn.textContent = 'Save & Link';
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

class ValidationError extends Error {
  constructor() { super('Validation failed'); }
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
  container.querySelector('#combo-error').textContent = '';
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
