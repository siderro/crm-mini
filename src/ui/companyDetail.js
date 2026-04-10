import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

export async function renderCompanyDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: company, error },
      { data: deals },
      { data: companyContacts }
    ] = await Promise.all([
      sb.from('companies').select('*').eq('id', id).single(),
      sb.from('deals').select('*').eq('company_id', id).order('updated_at', { ascending: false }),
      sb.from('company_contacts').select('*, contacts(id, first_name, last_name, email)').eq('company_id', id),
    ]);

    if (error || !company) {
      container.innerHTML = '<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';
      return;
    }

    const dealList = deals || [];
    const contactList = companyContacts || [];

    // Build compact metadata line
    const metaParts = [];
    if (company.official_name) metaParts.push(`off: ${esc(company.official_name)}`);
    if (company.email) metaParts.push(`<a href="mailto:${escapeAttr(company.email)}">${esc(company.email)}</a>`);
    if (company.web) {
      const cleanWeb = company.web.replace(/^https?:\/\//i, '');
      metaParts.push(`<a href="${escapeAttr(company.web)}" target="_blank" rel="noopener">${esc(cleanWeb)}</a>`);
    }
    if (company.ico) metaParts.push(`ičo: ${esc(company.ico)}`);
    metaParts.push(`upd ${timeAgo(company.updated_at)}`);
    metaParts.push(`add ${timeAgo(company.created_at)}`);

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/companies" class="btn btn-back">&larr; Back</a>
            <div class="detail-actions">
              <button id="edit-company" class="btn btn-secondary">Edit</button>
              <button id="delete-company" class="btn btn-danger">Del</button>
            </div>
          </div>
          <div class="detail-title">
            <h1>${esc(company.name)}</h1>
          </div>
        </div>

        <div class="compact-meta">${metaParts.join(' · ')}</div>

        <div class="detail-grid">
          <div class="detail-main">
            ${company.notes ? `<div class="card"><pre class="notes-pre">${esc(company.notes)}</pre></div>` : ''}

            ${contactList.length > 0 ? `
            <div class="card">
              <h2>Contacts <span class="badge">${contactList.length}</span></h2>
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
              <h2>Deals <span class="badge">${dealList.length}</span></h2>
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
          </div>
        </div>
      </div>
    `;

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
    'OPP': 'OPP',
    'proposal_sent': 'Proposal',
    'negotiation': 'Negotiation',
    'frozen': 'Frozen',
    'won_wip': 'Won(WIP)',
    'won_done': 'Won',
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
