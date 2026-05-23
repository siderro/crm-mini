import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

export async function renderCompanyDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: company, error },
      { data: deals },
      { data: companyContacts },
      { data: activities }
    ] = await Promise.all([
      sb.from('companies').select('*').eq('id', id).single(),
      sb.from('deals').select('*').eq('company_id', id).order('updated_at', { ascending: false }),
      sb.from('company_contacts').select('*, contacts(id, first_name, last_name, email)').eq('company_id', id),
      sb.from('activities').select('*, contacts(first_name, last_name), deals(title)').eq('company_id', id).order('created_at', { ascending: false }),
    ]);

    if (error || !company) {
      container.innerHTML = '<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';
      return;
    }

    const dealList = deals || [];
    const contactList = companyContacts || [];
    const activityList = activities || [];

    // Build compact metadata line
    const metaParts = [];
    if (company.official_name) metaParts.push(`Off: ${esc(company.official_name)}`);
    if (company.email) metaParts.push(`Email: <a href="mailto:${escapeAttr(company.email)}">${esc(company.email)}</a>`);
    if (company.web) {
      const cleanWeb = company.web.replace(/^https?:\/\//i, '');
      metaParts.push(`Web: <a href="${escapeAttr(company.web)}" target="_blank" rel="noopener">${esc(cleanWeb)}</a>`);
    }
    if (company.ico) metaParts.push(`IČO: ${esc(company.ico)}`);
    metaParts.push(`Upd: ${timeAgo(company.updated_at)}`);
    metaParts.push(`Add: ${timeAgo(company.created_at)}`);

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/companies" class="btn btn-back">&larr; Back</a>
            <h1>${esc(company.name)}</h1>
            <div class="detail-actions">
              <button id="edit-company" class="btn btn-secondary">Edit</button>
              <button id="delete-company" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="compact-meta">${metaParts.join(' · ')}</div>

        <div class="detail-grid">
          <div class="detail-main">
            ${company.notes ? `<div class="notes-block"><pre class="notes-pre">${esc(company.notes)}</pre></div>` : ''}

            ${contactList.length > 0 ? `
            <div class="card">
              <div class="section-bar section-bar-contacts">Contacts (${contactList.length})</div>
              <div class="compact-list">
                ${contactList.map(cc => `
                  <div class="compact-list-item clickable-row" data-id="${cc.contacts.id}">
                    <strong>${esc(cc.contacts.first_name)} ${esc(cc.contacts.last_name)}</strong>
                    ${cc.contacts.email ? ` · ${esc(cc.contacts.email)}` : ''}
                    ${cc.role ? ` · ${esc(cc.role)}` : ''}
                  </div>
                `).join('')}
              </div>
            </div>` : ''}

            ${dealList.length > 0 ? `
            <div class="card">
              <div class="section-bar section-bar-deals">Deals (${dealList.length})</div>
              <div class="compact-list">
                ${dealList.map(d => `
                  <div class="compact-list-item clickable-row" data-id="${d.id}" data-type="deal">
                    <strong>${esc(d.title)}</strong> · <span class="status-badge status-${d.status}">${getStatusLabel(d.status)}</span>
                    ${d.amount ? ` · ${Math.round(parseFloat(d.amount) / 1000)}k Kč` : ''}
                    · upd ${timeAgo(d.updated_at)}
                  </div>
                `).join('')}
              </div>
            </div>` : ''}

            <div class="card activity-card">
              <div class="section-bar section-bar-activity">Activity (${activityList.length})</div>
              <form id="activity-form" class="activity-form">
                <div class="activity-input-row">
                  <textarea id="activity-content" class="input" placeholder="Add note..." rows="2" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Add</button>
              </form>
              <div class="activity-timeline">
                ${activityList.length === 0
                  ? '<div class="empty-state">No activity.</div>'
                  : activityList.map(a => `
                    <div class="activity-item">
                      <div class="activity-meta">
                        ${a.contacts ? `<span class="activity-contact-badge">${esc(a.contacts.first_name)} ${esc(a.contacts.last_name)}</span>` : ''}
                        ${a.deals?.title ? `<span class="activity-project-badge">${esc(a.deals.title)}</span>` : ''}
                        <span class="activity-time">${timeAgo(a.created_at)}</span>
                      </div>
                      <p>${esc(a.content).replace(/\n/g, '<br>')}</p>
                    </div>
                  `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add activity
    container.querySelector('#activity-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = container.querySelector('#activity-content').value.trim();
      if (!content) return;
      const user = (await sb.auth.getUser()).data.user;
      const { error: insErr } = await sb.from('activities').insert({
        company_id: id,
        user_id: user.id,
        content,
      });
      if (insErr) { alert('Error: ' + insErr.message); return; }
      await renderCompanyDetail(container, id);
    });

    // Delete company
    container.querySelector('#delete-company').addEventListener('click', async () => {
      await deleteWithUndo('companies', company, `"${company.name}"`,
        () => { window.location.hash = '#/companies'; },
        () => { window.location.hash = `#/companies/${id}`; }
      );
    });

    // Edit company
    container.querySelector('#edit-company').addEventListener('click', () => {
      window.location.hash = `#/companies/${id}/edit`;
    });

    // Click on contact rows
    container.querySelectorAll('.clickable-row[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        if (row.dataset.type === 'deal') {
          window.location.hash = `#/deals/${row.dataset.id}`;
        } else {
          window.location.hash = `#/contacts/${row.dataset.id}`;
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function getStatusLabel(status) {
  const labels = {
    'open': 'Open',
    'frozen': 'Frozen',
    'won': 'Won',
    'lost': 'Lost'
  };
  return labels[status] || status;
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
