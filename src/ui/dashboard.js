import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';

const OPEN_STATUSES = ['open'];

export async function renderDashboard(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: contacts },
      { data: openProjects },
    ] = await Promise.all([
      sb.from('contacts').select('id, first_name, last_name, company_id, updated_at, companies(name)').order('last_name'),
      sb.from('projects').select('id, title, amount, status, updated_at, contact_id, contacts(first_name, last_name)').in('status', OPEN_STATUSES).order('title'),
    ]);

    // Stale contacts: sort by updated_at (oldest first), top 10
    const staleContacts = (contacts || [])
      .map(c => ({ ...c }))
      .sort((a, b) => {
        if (!a.updated_at && !b.updated_at) return 0;
        if (!a.updated_at) return -1;
        if (!b.updated_at) return 1;
        return new Date(a.updated_at) - new Date(b.updated_at);
      })
      .slice(0, 10);

    // Stale projects: open projects sorted by updated_at (oldest first)
    const staleProjects = (openProjects || [])
      .map(d => ({ ...d }))
      .sort((a, b) => {
        if (!a.updated_at && !b.updated_at) return 0;
        if (!a.updated_at) return -1;
        if (!b.updated_at) return 1;
        return new Date(a.updated_at) - new Date(b.updated_at);
      });

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
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  ${staleContacts.map(c => `
                    <tr class="clickable-row" data-href="#/contacts/${c.id}">
                      <td><strong>${esc(c.first_name)} ${esc(c.last_name)}</strong></td>
                      <td>${c.companies?.name ? esc(c.companies.name) : '<span class="muted">-</span>'}</td>
                      <td>${c.updated_at ? timeAgo(c.updated_at) : '<span class="muted">never</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
        </div>

        <div class="dashboard-section">
          <div class="section-bar section-bar-deals">Stale projects</div>
          ${staleProjects.length === 0
            ? '<div class="empty-state">No open projects.</div>'
            : `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Amount</th>
                    <th>Contact</th>
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  ${staleProjects.map(d => `
                    <tr class="clickable-row" data-href="#/projects/${d.id}">
                      <td><strong>${esc(d.title)}</strong></td>
                      <td>${d.amount ? `${Math.round(parseFloat(d.amount) / 1000)}k` : '<span class="muted">-</span>'}</td>
                      <td>${d.contacts ? `${esc(d.contacts.first_name)} ${esc(d.contacts.last_name)}` : '<span class="muted">-</span>'}</td>
                      <td>${d.updated_at ? timeAgo(d.updated_at) : '<span class="muted">never</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
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
