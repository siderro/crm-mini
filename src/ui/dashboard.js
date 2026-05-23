import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';

const OPEN_STATUSES = ['open'];

export async function renderDashboard(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: contacts },
      { data: lastContactActivity },
      { data: openDeals },
      { data: lastDealActivity },
      { data: recentActivities }
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name, company_id, companies(name)').order('last_name'),
      sb.rpc('get_contacts_last_activity'),
      sb.from('deals').select('id, title, amount, status, contact_id, contacts(first_name, last_name)').in('status', OPEN_STATUSES).order('title'),
      sb.rpc('get_deals_last_activity'),
      sb.from('activities').select('*, contacts(first_name, last_name), deals(title), companies(name)').order('created_at', { ascending: false }).limit(10)
    ]);

    // Build last activity maps
    const contactLastMap = new Map(
      (lastContactActivity || []).map(r => [r.contact_id, r.last_activity_at])
    );
    const dealLastMap = new Map(
      (lastDealActivity || []).map(r => [r.deal_id, r.last_activity_at])
    );

    // Stale contacts: sort by last activity (oldest/never first), top 10
    const staleContacts = (contacts || [])
      .map(c => ({ ...c, lastActivity: contactLastMap.get(c.id) || null }))
      .sort((a, b) => {
        if (!a.lastActivity && !b.lastActivity) return 0;
        if (!a.lastActivity) return -1;
        if (!b.lastActivity) return 1;
        return new Date(a.lastActivity) - new Date(b.lastActivity);
      })
      .slice(0, 10);

    // Stale deals: open deals sorted by last activity (oldest/never first)
    const staleDeals = (openDeals || [])
      .map(d => ({ ...d, lastActivity: dealLastMap.get(d.id) || null }))
      .sort((a, b) => {
        if (!a.lastActivity && !b.lastActivity) return 0;
        if (!a.lastActivity) return -1;
        if (!b.lastActivity) return 1;
        return new Date(a.lastActivity) - new Date(b.lastActivity);
      });

    const activityList = recentActivities || [];

    container.innerHTML = `
      <div class="detail-page">
        <div class="dashboard-section">
          <div class="section-bar section-bar-contacts">Stale contacts</div>
          ${staleContacts.length === 0
            ? '<div class="empty-state">No contacts.</div>'
            : `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  ${staleContacts.map(c => `
                    <tr class="clickable-row" data-href="#/contacts/${c.id}">
                      <td><strong>${esc(c.first_name)} ${esc(c.last_name)}</strong></td>
                      <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
                      <td>${c.lastActivity ? timeAgo(c.lastActivity) : '<span class="muted">never</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
        </div>

        <div class="dashboard-section">
          <div class="section-bar section-bar-deals">Stale deals</div>
          ${staleDeals.length === 0
            ? '<div class="empty-state">No open deals.</div>'
            : `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Amount</th>
                    <th>Contact</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  ${staleDeals.map(d => `
                    <tr class="clickable-row" data-href="#/deals/${d.id}">
                      <td><strong>${esc(d.title)}</strong></td>
                      <td>${d.amount ? `${Math.round(parseFloat(d.amount) / 1000)}k` : '<span class="muted">-</span>'}</td>
                      <td>${d.contacts ? `${esc(d.contacts.first_name)} ${esc(d.contacts.last_name)}` : '<span class="muted">-</span>'}</td>
                      <td>${d.lastActivity ? timeAgo(d.lastActivity) : '<span class="muted">never</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
        </div>

        <div class="dashboard-section">
          <div class="section-bar section-bar-activity">Recent activity (${activityList.length})</div>
          <div class="activity-timeline">
            ${activityList.length === 0
              ? '<div class="empty-state">No activity.</div>'
              : activityList.map(a => `
                <div class="activity-item">
                  <div class="activity-meta">
                    ${a.contacts ? `<a href="#/contacts/${a.contact_id}" class="activity-contact-badge">${esc(a.contacts.first_name)} ${esc(a.contacts.last_name)}</a>` : ''}
                    ${a.deals?.title ? `<a href="#/deals/${a.deal_id}" class="activity-project-badge">${esc(a.deals.title)}</a>` : ''}
                    ${a.companies?.name ? `<a href="#/companies/${a.company_id}" class="activity-project-badge">${esc(a.companies.name)}</a>` : ''}
                    <span class="activity-time">${timeAgo(a.created_at)}</span>
                  </div>
                  <p>${esc(a.content).replace(/\n/g, '<br>')}</p>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    `;

    // Click handlers for table rows
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.hash = row.dataset.href;
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
