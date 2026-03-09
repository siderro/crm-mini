import { sb } from '../supabase.js';

const STATUS_OPTIONS = [
  { value: 'OPP', label: 'OPP' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'won_wip', label: 'Won (WIP)' },
  { value: 'won_done', label: 'Won (Done)' },
  { value: 'lost', label: 'Lost' }
];

export async function renderDealForm(container, id = null) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const isEdit = !!id;
  let deal = { title: '', amount: '', status: 'OPP', expected_close: '', contact_id: '', company_id: '', notes: '' };

  try {
    const [
      { data: contacts },
      { data: companies }
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name').order('last_name'),
      sb.from('companies').select('id, name').order('name')
    ]);

    if (isEdit) {
      const { data, error } = await sb.from('deals').select('*').eq('id', id).single();
      if (error || !data) {
        container.innerHTML = '<div class="error">Deal not found. <a href="#/deals">Back to list</a></div>';
        return;
      }
      deal = data;
    }

    container.innerHTML = `
      <div class="form-page">
        <a href="${isEdit ? `#/deals/${id}` : '#/deals'}" class="btn btn-back">&larr; ${isEdit ? 'Back to deal' : 'Back to list'}</a>
        <h1>${isEdit ? 'Edit Deal' : 'New Deal'}</h1>

        <form id="deal-form" class="card form-card" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="title">Deal Title *</label>
              <input type="text" id="title" class="input" value="${escapeAttr(deal.title)}" required>
              <span class="field-error" id="err-title"></span>
            </div>
            <div class="form-group">
              <label for="amount">Amount</label>
              <input type="number" id="amount" class="input" value="${deal.amount || ''}" step="0.01" placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="status">Status *</label>
              <select id="status" class="input" required>
                ${STATUS_OPTIONS.map(opt =>
                  `<option value="${opt.value}"${deal.status === opt.value ? ' selected' : ''}>${opt.label}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="expected_close">Expected Close</label>
              <input type="date" id="expected_close" class="input" value="${deal.expected_close || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="contact_id">Contact</label>
              <select id="contact_id" class="input">
                <option value="">-- None --</option>
                ${(contacts || []).map(c =>
                  `<option value="${c.id}"${deal.contact_id === c.id ? ' selected' : ''}>${esc(c.first_name)} ${esc(c.last_name)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="company_id">Company</label>
              <select id="company_id" class="input">
                <option value="">-- None --</option>
                ${(companies || []).map(c =>
                  `<option value="${c.id}"${deal.company_id === c.id ? ' selected' : ''}>${esc(c.name)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" class="input" rows="4">${esc(deal.notes || '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="submit-btn">${isEdit ? 'Save Changes' : 'Create Deal'}</button>
            <a href="${isEdit ? `#/deals/${id}` : '#/deals'}" class="btn btn-secondary">Cancel</a>
          </div>
          <div class="form-error" id="form-error"></div>
        </form>
      </div>
    `;

    container.querySelector('#deal-form').addEventListener('submit', async (e) => {
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
        showFieldError(container, 'title', 'Deal title is required');
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
          const { error } = await sb.from('deals').update(payload).eq('id', id);
          if (error) throw error;
          window.location.hash = `#/deals/${id}`;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { data, error } = await sb.from('deals').insert(payload).select().single();
          if (error) throw error;
          window.location.hash = `#/deals/${data.id}`;
        }
      } catch (err) {
        container.querySelector('#form-error').textContent = 'Error: ' + err.message;
        btn.disabled = false;
        btn.textContent = isEdit ? 'Save Changes' : 'Create Deal';
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
