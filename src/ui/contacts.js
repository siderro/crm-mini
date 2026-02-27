import { sb } from '../supabase.js';
import { debounce } from '../utils/debounce.js';
import { exportCSV } from '../utils/csv.js';
import { timeAgo } from '../utils/time.js';

let currentSort = { col: 'last_name', asc: true };
let currentSearch = '';
let currentFilter = 'all'; // all | with_email | with_phone | with_company

async function fetchContacts() {
  let q = sb.from('contacts').select('*, companies(name)');

  if (currentSearch) {
    q = q.or(
      `first_name.ilike.%${currentSearch}%,last_name.ilike.%${currentSearch}%,email.ilike.%${currentSearch}%,notes.ilike.%${currentSearch}%`
    );
  }

  if (currentFilter === 'with_email') q = q.not('email', 'is', null).neq('email', '');
  if (currentFilter === 'with_phone') q = q.not('phone', 'is', null).neq('phone', '');
  if (currentFilter === 'with_company') q = q.not('company_id', 'is', null);

  q = q.order(currentSort.col, { ascending: currentSort.asc });

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function fetchCompanies() {
  const { data } = await sb.from('companies').select('id, name').order('name');
  return data || [];
}

function sortIcon(col) {
  if (currentSort.col !== col) return '';
  return currentSort.asc ? ' \u2191' : ' \u2193';
}

export async function renderContacts(container) {
  container.innerHTML = '<div class="loading">Loading contacts...</div>';

  try {
    const [contacts, companies] = await Promise.all([fetchContacts(), fetchCompanies()]);

    container.innerHTML = `
      <div class="page-header">
        <h1>Contacts <span class="badge">${contacts.length}</span></h1>
        <div class="header-actions">
          <button id="csv-export" class="btn btn-secondary">Export CSV</button>
          <a href="#/contacts/new" class="btn btn-primary">+ New Contact</a>
        </div>
      </div>

      <div class="toolbar">
        <input type="search" id="search-input" class="input" placeholder="Search name, email, notes..." value="${escapeAttr(currentSearch)}">
        <select id="filter-select" class="input">
          <option value="all"${currentFilter === 'all' ? ' selected' : ''}>All contacts</option>
          <option value="with_email"${currentFilter === 'with_email' ? ' selected' : ''}>With email</option>
          <option value="with_phone"${currentFilter === 'with_phone' ? ' selected' : ''}>With phone</option>
          <option value="with_company"${currentFilter === 'with_company' ? ' selected' : ''}>With company</option>
        </select>
      </div>

      ${contacts.length === 0
        ? '<div class="empty-state">No contacts found. <a href="#/contacts/new">Create your first contact</a>.</div>'
        : `<div class="table-wrap"><table class="data-table">
        <thead>
          <tr>
            <th class="sortable" data-col="last_name">Name${sortIcon('last_name')}</th>
            <th class="sortable" data-col="email">Email${sortIcon('email')}</th>
            <th class="sortable" data-col="phone">Phone${sortIcon('phone')}</th>
            <th>Company</th>
            <th class="sortable" data-col="created_at">Created${sortIcon('created_at')}</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(c => `
            <tr class="clickable-row" data-id="${c.id}">
              <td><strong>${esc(c.first_name)} ${esc(c.last_name)}</strong></td>
              <td>${c.email ? `<a href="mailto:${escapeAttr(c.email)}" onclick="event.stopPropagation()">${esc(c.email)}</a>` : '<span class="muted">-</span>'}</td>
              <td>${c.phone ? esc(c.phone) : '<span class="muted">-</span>'}</td>
              <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
              <td>${timeAgo(c.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>`}

      <div class="stats-sidebar">
        <h3>Quick Stats</h3>
        <div class="stat-item">Total: <strong>${contacts.length}</strong></div>
        <div class="stat-item">With email: <strong>${contacts.filter(c => c.email).length}</strong></div>
        <div class="stat-item">With phone: <strong>${contacts.filter(c => c.phone).length}</strong></div>
        <div class="stat-item">With company: <strong>${contacts.filter(c => c.company_id).length}</strong></div>
        <div class="stat-item">With notes: <strong>${contacts.filter(c => c.notes).length}</strong></div>
      </div>
    `;

    // Event listeners
    const searchInput = container.querySelector('#search-input');
    const onSearch = debounce(async () => {
      currentSearch = searchInput.value.trim();
      await renderContacts(container);
    }, 350);
    searchInput.addEventListener('input', onSearch);

    container.querySelector('#filter-select').addEventListener('change', async (e) => {
      currentFilter = e.target.value;
      await renderContacts(container);
    });

    container.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', async () => {
        const col = th.dataset.col;
        if (currentSort.col === col) {
          currentSort.asc = !currentSort.asc;
        } else {
          currentSort = { col, asc: true };
        }
        await renderContacts(container);
      });
    });

    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.hash = `#/contacts/${row.dataset.id}`;
      });
    });

    container.querySelector('#csv-export').addEventListener('click', () => {
      exportCSV(contacts, companies);
    });

    // Focus search if it had a value
    if (currentSearch) {
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }

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
