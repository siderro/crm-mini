import { sb } from '../supabase.js';
import { debounce } from '../utils/debounce.js';
import { exportCSV } from '../utils/csv.js';
import { timeAgo } from '../utils/time.js';

const OPEN_STATUSES = ['OPP', 'proposal_sent', 'negotiation'];

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

async function fetchOpenDealLinks() {
  // Get contacts with direct open deals
  const { data: contactDeals } = await sb.from('deals')
    .select('contact_id')
    .in('status', OPEN_STATUSES)
    .not('contact_id', 'is', null);

  // Get companies with open deals
  const { data: companyDeals } = await sb.from('deals')
    .select('company_id')
    .in('status', OPEN_STATUSES)
    .not('company_id', 'is', null);

  const contactsWithDeals = new Set((contactDeals || []).map(d => d.contact_id));
  const companiesWithDeals = new Set((companyDeals || []).map(d => d.company_id));

  return { contactsWithDeals, companiesWithDeals };
}

function sortIcon(col) {
  if (currentSort.col !== col) return '';
  return currentSort.asc ? ' \u2191' : ' \u2193';
}

export async function renderContacts(container) {
  container.innerHTML = '<div class="loading">Loading contacts...</div>';

  try {
    const [contacts, companies, openDealLinks] = await Promise.all([
      fetchContacts(),
      fetchCompanies(),
      fetchOpenDealLinks()
    ]);

    // Group contacts
    const linkedToOpenDeals = contacts.filter(c =>
      openDealLinks.contactsWithDeals.has(c.id) ||
      (c.company_id && openDealLinks.companiesWithDeals.has(c.company_id))
    ).sort((a, b) => {
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    const others = contacts.filter(c =>
      !openDealLinks.contactsWithDeals.has(c.id) &&
      !(c.company_id && openDealLinks.companiesWithDeals.has(c.company_id))
    ).sort((a, b) => {
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });

    container.innerHTML = `
      <div class="page-header">
        <h1>Contacts <span class="badge">${contacts.length}</span></h1>
        <div class="header-actions">
          <button id="csv-export" class="btn btn-secondary">Export CSV</button>
          <a href="https://www.icloud.com/contacts/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">🍎 Contacts</a>
          <a href="#/contacts/new" class="btn btn-primary">+ New Contact</a>
        </div>
      </div>

      <div class="contacts-layout">
        <div class="contacts-main">
          <div class="toolbar">
            <input type="search" id="search-input" class="input" placeholder="Search name, email, notes..." value="${escapeAttr(currentSearch)}">
            <select id="filter-select" class="input">
              <option value="all"${currentFilter === 'all' ? ' selected' : ''}>All contacts</option>
              <option value="with_email"${currentFilter === 'with_email' ? ' selected' : ''}>With email</option>
              <option value="with_phone"${currentFilter === 'with_phone' ? ' selected' : ''}>With phone</option>
              <option value="with_company"${currentFilter === 'with_company' ? ' selected' : ''}>With company</option>
            </select>
          </div>

          ${renderGroupedContacts(linkedToOpenDeals, others)}
        </div>

        <div class="contacts-sidebar">
          <h2 class="group-heading">Starred <span class="badge">0</span></h2>
          <div class="empty-state muted">No starred contacts yet.</div>
        </div>
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

function renderGroupedContacts(linkedToOpenDeals, others) {
  let html = '';

  // Group 1: Contacts linked to open deals
  if (linkedToOpenDeals.length > 0) {
    html += `
      <div class="deal-group">
        <h2 class="group-heading">Open Deals <span class="badge">${linkedToOpenDeals.length}</span></h2>
        ${renderContactTable(linkedToOpenDeals)}
      </div>
    `;
  }

  // Group 2: All other contacts
  if (others.length > 0) {
    html += `
      <div class="deal-group">
        <h2 class="group-heading">Other <span class="badge">${others.length}</span></h2>
        ${renderContactTable(others)}
      </div>
    `;
  }

  if (linkedToOpenDeals.length === 0 && others.length === 0) {
    html = '<div class="empty-state">No contacts. <a href="#/contacts/new">Create first</a>.</div>';
  }

  return html;
}

function renderContactTable(contacts) {
  return `
    <div class="table-wrap">
      <table class="data-table table-contacts">
        <thead>
          <tr>
            <th class="sortable" data-col="last_name">Name${sortIcon('last_name')}</th>
            <th class="sortable" data-col="email">Email${sortIcon('email')}</th>
            <th class="sortable" data-col="phone">Phone${sortIcon('phone')}</th>
            <th>Company</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(c => `
            <tr class="clickable-row" data-id="${c.id}">
              <td><strong>${esc(c.first_name)} ${esc(c.last_name)}</strong></td>
              <td>${c.email ? `<a href="mailto:${escapeAttr(c.email)}" onclick="event.stopPropagation()">${esc(c.email)}</a>` : '<span class="muted">-</span>'}</td>
              <td>${c.phone ? esc(c.phone) : '<span class="muted">-</span>'}</td>
              <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
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
