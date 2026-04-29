import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

const OPEN_STATUSES = ['open'];

export async function renderDealDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    // First get the deal
    const { data: deal, error } = await sb.from('deals').select('*').eq('id', id).single();

    if (error || !deal) {
      container.innerHTML = '<div class="error">Deal not found. <a href="#/deals">Back to list</a></div>';
      return;
    }

    // Get contact if deal has contact_id
    let contact = null;
    if (deal.contact_id) {
      const { data: c } = await sb.from('contacts').select('id, first_name, last_name, email').eq('id', deal.contact_id).single();
      contact = c;
    }

    // Get company if deal has company_id
    let company = null;
    if (deal.company_id) {
      const { data: c } = await sb.from('companies').select('id, name').eq('id', deal.company_id).single();
      company = c;
    }

    // Get activities for this deal (by deal_id OR by contact_id)
    let activities = [];

    // Activities explicitly assigned to this deal
    const { data: dealActivities } = await sb.from('activities')
      .select('*, contacts(first_name, last_name)')
      .eq('deal_id', id)
      .order('created_at', { ascending: false });

    // Activities from the deal's contact
    let contactActivities = [];
    if (deal.contact_id) {
      const { data: ca } = await sb.from('activities')
        .select('*, contacts(first_name, last_name)')
        .eq('contact_id', deal.contact_id)
        .order('created_at', { ascending: false });
      contactActivities = ca || [];
    }

    // Merge and deduplicate by id
    const merged = [...(dealActivities || []), ...contactActivities];
    const unique = Array.from(new Map(merged.map(a => [a.id, a])).values());

    // Sort by created_at desc
    unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    activities = unique;

    const activityList = activities || [];
    const isOpenStatus = OPEN_STATUSES.includes(deal.status);
    const isFrozen = deal.status === 'frozen';

    // Build compact metadata line
    const metaParts = [];
    if (deal.amount) metaParts.push(`${Math.round(parseFloat(deal.amount) / 1000)}k Kč`);
    metaParts.push(`<span class="status-badge status-${deal.status}">${getStatusLabel(deal.status)}</span>`);
    if (deal.expected_close) metaParts.push(`exp: ${new Date(deal.expected_close).toLocaleDateString('cs-CZ')}`);
    if (contact) metaParts.push(`<a href="#/contacts/${contact.id}">${esc(contact.first_name)} ${esc(contact.last_name)}</a>`);
    if (company) metaParts.push(`<a href="#/companies/${company.id}">${esc(company.name)}</a>`);
    metaParts.push(`upd ${timeAgo(deal.updated_at)}`);
    metaParts.push(`add ${timeAgo(deal.created_at)}`);

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/deals" class="btn btn-back">&larr; Back</a>
            <div class="detail-actions">
              ${isOpenStatus ? `<button id="freeze-deal" class="btn btn-freeze">❄️</button>` : ''}
              ${isFrozen ? `<button id="unfreeze-deal" class="btn btn-success">Unfreeze</button>` : ''}
              <button id="edit-deal" class="btn btn-secondary">Edit</button>
              <button id="delete-deal" class="btn btn-danger">Del</button>
            </div>
          </div>
          <div class="detail-title">
            <h1>${esc(deal.title)}</h1>
          </div>
        </div>

        <div class="compact-meta">${metaParts.join(' · ')}</div>

        <div class="detail-grid">
          <div class="detail-main">
            ${deal.notes ? `<div class="card"><pre class="notes-pre">${esc(deal.notes)}</pre></div>` : ''}

            <div class="card activity-card">
              <h2>Activity <span class="badge">${activityList.length}</span></h2>
              <div class="activity-timeline">
                ${activityList.length === 0
                  ? '<div class="empty-state">No activity.</div>'
                  : activityList.map(a => `
                    <div class="activity-item">
                      <div class="activity-meta">
                        ${a.contacts ? `<span class="activity-contact-badge">${esc(a.contacts.first_name)} ${esc(a.contacts.last_name)}</span>` : ''}
                        ${a.deal_id === id ? '<span class="activity-project-badge">This deal</span>' : ''}
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

    // Freeze deal
    const freezeBtn = container.querySelector('#freeze-deal');
    if (freezeBtn) {
      freezeBtn.addEventListener('click', async () => {
        const { error } = await sb.from('deals')
          .update({ status: 'frozen' })
          .eq('id', id);
        if (error) { alert('Error: ' + error.message); return; }
        await renderDealDetail(container, id);
      });
    }

    // Unfreeze deal
    const unfreezeBtn = container.querySelector('#unfreeze-deal');
    if (unfreezeBtn) {
      unfreezeBtn.addEventListener('click', async () => {
        const { error } = await sb.from('deals')
          .update({ status: 'open' })
          .eq('id', id);
        if (error) { alert('Error: ' + error.message); return; }
        await renderDealDetail(container, id);
      });
    }

    // Edit deal
    container.querySelector('#edit-deal').addEventListener('click', () => {
      window.location.hash = `#/deals/${id}/edit`;
    });

    // Delete deal
    container.querySelector('#delete-deal').addEventListener('click', async () => {
      await deleteWithUndo('deals', deal, `"${deal.title}"`,
        () => { window.location.hash = '#/deals'; },
        () => { window.location.hash = `#/deals/${id}`; }
      );
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
