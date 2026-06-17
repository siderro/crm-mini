import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

export async function renderCompanyDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [
      { data: company, error },
      { data: projects },
    ] = await Promise.all([
      sb.from('companies').select('*').eq('id', id).single(),
      sb.from('projects').select('*').eq('company_id', id).order('updated_at', { ascending: false }),
    ]);

    if (error || !company) {
      container.innerHTML = '<div class="error">Company not found. <a href="#/companies">Back to list</a></div>';
      return;
    }

    const projectList = projects || [];

    // Build compact metadata line
    const metaParts = [];
    if (company.official_name) metaParts.push(`Off: ${esc(company.official_name)}`);
    if (company.email) metaParts.push(`Email: <a href="mailto:${escapeAttr(company.email)}">${esc(company.email)}</a>`);
    if (company.web) {
      const cleanWeb = company.web.replace(/^https?:\/\//i, '');
      metaParts.push(`Web: <a href="${escapeAttr(company.web)}" target="_blank" rel="noopener">${esc(cleanWeb)}</a>`);
    }
    if (company.ico) metaParts.push(`ICO: ${esc(company.ico)}`);
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

            ${projectList.length > 0 ? `
            <div class="card">
              <div class="section-bar section-bar-deals">Projects (${projectList.length})</div>
              <div class="compact-list">
                ${projectList.map(d => `
                  <div class="compact-list-item clickable-row" data-id="${d.id}" data-type="project">
                    <strong>${esc(d.title)}</strong> · <span class="status-badge status-${d.status}">${getStatusLabel(d.status)}</span>
                    ${d.amount ? ` · ${Math.round(parseFloat(d.amount) / 1000)}k Kc` : ''}
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

    // Click on project rows
    container.querySelectorAll('.clickable-row[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        if (row.dataset.type === 'project') {
          window.location.hash = `#/projects/${row.dataset.id}`;
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
