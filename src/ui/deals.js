import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

// Define status groups and labels
const OPEN_STATUSES = ['open'];
const STATUS_LABELS = {
  'open': 'Open',
  'frozen': 'Frozen',
  'won': 'Won',
  'lost': 'Lost'
};

const STATUS_GROUPS = [
  { key: 'open', title: '😀 Open', statuses: ['open'] },
  { key: 'frozen', title: '❄️ Frozen', statuses: ['frozen'] },
  { key: 'won', title: 'Won', statuses: ['won'] },
  { key: 'lost', title: '💀 Lost', statuses: ['lost'] }
];

export async function renderDeals(container) {
  container.innerHTML = '<div class="loading">Loading deals...</div>';

  try {
    const { data: deals, error } = await sb.from('deals')
      .select('*, contacts(first_name, last_name), companies(name)')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const { data: contacts } = await sb.from('contacts').select('id, first_name, last_name').order('last_name');
    const { data: companies } = await sb.from('companies').select('id, name').order('name');

    const list = deals || [];
    const contactsList = contacts || [];
    const companiesList = companies || [];

    // Calculate stats
    const totalValue = list.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const frozenDeals = list.filter(d => d.status === 'frozen');
    const frozenValue = frozenDeals.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    // Group deals by status
    const groupedDeals = groupDealsByStatus(list);

    container.innerHTML = `
      <div class="page-header">
        <h1>Deals <span class="badge">${list.length}</span> <span class="header-meta">Total ${totalValue.toLocaleString('cs-CZ')} Kč / Frozen ${frozenValue.toLocaleString('cs-CZ')} Kč</span></h1>
        <div class="header-actions">
          <button id="add-deal-btn" class="btn btn-primary">+ New Deal</button>
        </div>
      </div>

      <div id="deal-form-wrap" class="card form-card" style="display:none">
        <h2 id="deal-form-title">New Deal</h2>
        <form id="deal-form">
          <input type="hidden" id="deal-edit-id" value="">
          <div class="form-row">
            <div class="form-group">
              <label for="d-title">Deal Title *</label>
              <input type="text" id="d-title" class="input" required>
            </div>
            <div class="form-group">
              <label for="d-amount">Amount</label>
              <input type="number" id="d-amount" class="input" step="0.01" placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="d-status">Status *</label>
              <select id="d-status" class="input" required>
                <option value="open">Open</option>
                <option value="frozen">Frozen</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div class="form-group">
              <label for="d-expected">Expected Close</label>
              <input type="date" id="d-expected" class="input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="d-contact">Contact</label>
              <select id="d-contact" class="input">
                <option value="">-- None --</option>
                ${contactsList.map(c => `<option value="${c.id}">${esc(c.first_name)} ${esc(c.last_name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="d-company">Company</label>
              <select id="d-company" class="input">
                <option value="">-- None --</option>
                ${companiesList.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="d-notes">Notes</label>
            <textarea id="d-notes" class="input" rows="3"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="deal-submit-btn">Create Deal</button>
            <button type="button" id="deal-cancel-btn" class="btn btn-secondary">Cancel</button>
          </div>
          <div class="form-error" id="deal-form-error"></div>
        </form>
      </div>

      ${renderGroupedDeals(groupedDeals, list)}
    `;

    const formWrap = container.querySelector('#deal-form-wrap');
    const form = container.querySelector('#deal-form');

    function showForm(deal = null) {
      formWrap.style.display = '';
      container.querySelector('#deal-form-title').textContent = deal ? 'Edit Deal' : 'New Deal';
      container.querySelector('#deal-submit-btn').textContent = deal ? 'Save Changes' : 'Create Deal';
      container.querySelector('#deal-edit-id').value = deal?.id || '';
      container.querySelector('#d-title').value = deal?.title || '';
      container.querySelector('#d-amount').value = deal?.amount || '';
      container.querySelector('#d-status').value = deal?.status || 'open';
      container.querySelector('#d-expected').value = deal?.expected_close || '';
      container.querySelector('#d-contact').value = deal?.contact_id || '';
      container.querySelector('#d-company').value = deal?.company_id || '';
      container.querySelector('#d-notes').value = deal?.notes || '';
      container.querySelector('#d-title').focus();
    }

    function hideForm() {
      formWrap.style.display = 'none';
      form.reset();
      container.querySelector('#deal-edit-id').value = '';
      container.querySelector('#deal-form-error').textContent = '';
    }

    container.querySelector('#add-deal-btn').addEventListener('click', () => showForm());
    container.querySelector('#deal-cancel-btn').addEventListener('click', hideForm);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#d-title').value.trim();
      if (!title) { container.querySelector('#deal-form-error').textContent = 'Deal title is required'; return; }

      const editId = container.querySelector('#deal-edit-id').value;
      const payload = {
        title,
        amount: container.querySelector('#d-amount').value || null,
        status: container.querySelector('#d-status').value,
        expected_close: container.querySelector('#d-expected').value || null,
        contact_id: container.querySelector('#d-contact').value || null,
        company_id: container.querySelector('#d-company').value || null,
        notes: container.querySelector('#d-notes').value.trim() || null,
      };

      try {
        if (editId) {
          const { error } = await sb.from('deals').update(payload).eq('id', editId);
          if (error) throw error;
        } else {
          const user = (await sb.auth.getUser()).data.user;
          payload.user_id = user.id;
          const { error } = await sb.from('deals').insert(payload);
          if (error) throw error;
        }
        await renderDeals(container);
      } catch (err) {
        container.querySelector('#deal-form-error').textContent = 'Error: ' + err.message;
      }
    });

    // Edit links
    container.querySelectorAll('.edit-deal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const d = list.find(x => x.id === btn.dataset.id);
        if (d) showForm(d);
      });
    });

    // Delete links
    container.querySelectorAll('.delete-deal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const d = list.find(x => x.id === btn.dataset.id);
        if (!d) return;
        await deleteWithUndo('deals', d, `"${d.title}"`,
          () => renderDeals(container),
          () => renderDeals(container)
        );
      });
    });

    // Freeze links
    container.querySelectorAll('.freeze-deal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const dealId = btn.dataset.id;
        const currentStatus = btn.dataset.status;
        const { error } = await sb.from('deals')
          .update({ status: 'frozen', previous_status: currentStatus })
          .eq('id', dealId);
        if (error) { alert('Error: ' + error.message); return; }
        await renderDeals(container);
      });
    });

    // Unfreeze links
    container.querySelectorAll('.unfreeze-deal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const dealId = btn.dataset.id;
        const previousStatus = 'open';
        const { error } = await sb.from('deals')
          .update({ status: previousStatus, previous_status: null })
          .eq('id', dealId);
        if (error) { alert('Error: ' + error.message); return; }
        await renderDeals(container);
      });
    });

    // Click on deal rows
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.hash = `#/deals/${row.dataset.id}`;
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function groupDealsByStatus(deals) {
  const grouped = {};
  STATUS_GROUPS.forEach(group => {
    const groupDeals = deals.filter(d => group.statuses.includes(d.status));
    // Sort by updated_at desc, created_at desc, title asc
    groupDeals.sort((a, b) => {
      if (a.updated_at !== b.updated_at) return new Date(b.updated_at) - new Date(a.updated_at);
      if (a.created_at !== b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      return (a.title || '').localeCompare(b.title || '');
    });
    grouped[group.key] = { ...group, deals: groupDeals };
  });
  return grouped;
}

function renderGroupedDeals(groupedDeals, allDeals) {
  const maxValue = Math.max(...allDeals.map(d => parseFloat(d.amount) || 0), 1);

  return Object.values(groupedDeals).map(group => {
    if (group.deals.length === 0) return '';

    return `
      <div class="deal-group">
        <h2 class="group-heading">${group.title} <span class="badge">${group.deals.length}</span></h2>
        <div class="table-wrap">
          <table class="data-table table-deals">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Status</th>
                <th>Value</th>
                <th>Created/Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${group.deals.map(d => renderDealRow(d, maxValue)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function renderDealRow(d, maxValue) {
  const createdDays = getDaysAgo(d.created_at);
  const modifiedDays = getDaysAgo(d.updated_at);
  const amountNum = parseFloat(d.amount) || 0;
  const amount = amountNum.toLocaleString('cs-CZ', {minimumFractionDigits: 0, maximumFractionDigits: 0});
  const valuePct = maxValue > 0 ? (amountNum / maxValue) * 100 : 0;

  const isOpenStatus = OPEN_STATUSES.includes(d.status);
  const isFrozen = d.status === 'frozen';

  const statusLabel = STATUS_LABELS[d.status] || d.status;
  const progressBar = renderTextProgressBar(valuePct);

  return `
    <tr class="clickable-row" data-id="${d.id}">
      <td><strong>${esc(d.title)}</strong></td>
      <td>${statusLabel}</td>
      <td><span class="text-progress-bar">${progressBar}</span> ${amount} Kč</td>
      <td>(${createdDays}d / ${modifiedDays}d)</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        ${isOpenStatus ? `<a href="#" class="freeze-deal" data-id="${d.id}" data-status="${d.status}">Freeze</a>` : ''}
        ${isFrozen ? `<a href="#" class="unfreeze-deal" data-id="${d.id}">Unfreeze</a>` : ''}
        <a href="#" class="danger-link delete-deal" data-id="${d.id}" data-title="${escapeAttr(d.title)}">Delete</a>
      </td>
    </tr>
  `;
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

function getDaysAgo(dateStr) {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function renderTextProgressBar(percentage) {
  const pct = Math.round(percentage);
  const totalBlocks = 10;
  const filledBlocks = Math.round((pct / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;

  const filled = '█'.repeat(filledBlocks);
  const empty = '░'.repeat(emptyBlocks);

  return `${filled}${empty}`;
}
