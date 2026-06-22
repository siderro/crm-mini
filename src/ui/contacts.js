import { sb } from '../supabase.js';
import { debounce } from '../utils/debounce.js';
import { exportCSV } from '../utils/csv.js';
import { getTemperature } from '../utils/temperature.js';

const OPEN_STATUSES = ['open'];

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

async function fetchLastLogs() {
  const { data } = await sb.from('logs').select('contact_id, logged_at, content').not('contact_id', 'is', null).order('logged_at', { ascending: false });
  // Deduplicate: keep first (most recent) per contact
  const seen = new Map();
  for (const row of (data || [])) {
    if (!seen.has(row.contact_id)) {
      seen.set(row.contact_id, { date: row.logged_at, content: row.content });
    }
  }
  return Array.from(seen.entries()).map(([contact_id, info]) => ({ contact_id, last_date: info.date, content: info.content }));
}

async function fetchOpenDealLinks() {
  // Get contacts with direct open projects
  const { data: contactDeals } = await sb.from('projects')
    .select('contact_id')
    .in('status', OPEN_STATUSES)
    .not('contact_id', 'is', null);

  // Get companies with open projects
  const { data: companyDeals } = await sb.from('projects')
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
    const [contacts, companies, openDealLinks, lastLogs] = await Promise.all([
      fetchContacts(),
      fetchCompanies(),
      fetchOpenDealLinks(),
      fetchLastLogs(),
    ]);

    // Build contact_id → { date, content } map
    const lastLogMap = new Map();
    for (const row of lastLogs) {
      if (row.contact_id) lastLogMap.set(row.contact_id, { date: row.last_date, content: row.content });
    }

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
          <a href="https://www.icloud.com/contacts/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Contacts</a>
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

      ${renderGroupedContacts(linkedToOpenDeals, others, lastLogMap)}
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

function renderGroupedContacts(linkedToOpenDeals, others, lastLogMap) {
  let html = '';

  // Group 1: Contacts linked to open projects
  if (linkedToOpenDeals.length > 0) {
    html += `
      <div class="deal-group">
        <h2 class="group-heading">Open Projects <span class="badge">${linkedToOpenDeals.length}</span></h2>
        ${renderContactTable(linkedToOpenDeals, lastLogMap)}
      </div>
    `;
  }

  // Group 2: All other contacts
  if (others.length > 0) {
    html += `
      <div class="deal-group">
        <h2 class="group-heading">Other <span class="badge">${others.length}</span></h2>
        ${renderContactTable(others, lastLogMap)}
      </div>
    `;
  }

  if (linkedToOpenDeals.length === 0 && others.length === 0) {
    html = '<div class="empty-state">No contacts. <a href="#/contacts/new">Create first</a>.</div>';
  }

  return html;
}

function renderContactTable(contacts, lastLogMap) {
  return `
    <div class="table-wrap">
      <table class="data-table table-contacts">
        <thead>
          <tr>
            <th class="sortable" data-col="last_name">Name${sortIcon('last_name')}</th>
            <th class="sortable" data-col="email">Email${sortIcon('email')}</th>
            <th class="sortable" data-col="phone">Phone${sortIcon('phone')}</th>
            <th>Company</th>
            <th>Temp</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(c => {
            const logInfo = lastLogMap.get(c.id);
            const temp = getTemperature(logInfo?.date);
            const snippet = logInfo?.content ? truncate(logInfo.content, 80) : '';
            const incomplete = !c.email || !c.phone || !c.company_id;
            return `
            <tr class="clickable-row ${temp.css}" data-id="${c.id}">
              <td>
                <strong>${esc(c.first_name)} ${esc(c.last_name)}</strong>${incomplete ? ' <span class="incomplete-badge">[!]</span>' : ''}
                ${snippet ? `<div class="log-snippet">${esc(snippet)}</div>` : ''}
              </td>
              <td>${c.email ? `<a href="mailto:${escapeAttr(c.email)}" onclick="event.stopPropagation()">${esc(c.email)}</a>` : '<span class="muted">-</span>'}</td>
              <td>${c.phone ? esc(c.phone) : '<span class="muted">-</span>'}</td>
              <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
              <td class="${temp.css}">${temp.label}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
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
