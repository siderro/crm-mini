import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';

export async function renderContactDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [{ data: contact, error }, { data: activities }, { data: deals }] = await Promise.all([
      sb.from('contacts').select('*, companies(id, name)').eq('id', id).single(),
      sb.from('activities').select('*, deals(title)').eq('contact_id', id).order('created_at', { ascending: false }),
      sb.from('deals').select('id, title').order('title'),
    ]);

    if (error || !contact) {
      container.innerHTML = '<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';
      return;
    }

    const activityList = activities || [];

    // Build compact metadata line
    const metaParts = [];
    if (contact.email) metaParts.push(`<a href="mailto:${escapeAttr(contact.email)}">${esc(contact.email)}</a>`);
    if (contact.phone) metaParts.push(`<a href="tel:${escapeAttr(contact.phone)}">${esc(contact.phone)}</a>`);
    if (contact.companies?.name) metaParts.push(`${esc(contact.companies.name)}`);
    metaParts.push(`upd ${timeAgo(contact.updated_at)}`);
    metaParts.push(`add ${timeAgo(contact.created_at)}`);

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/contacts" class="btn btn-back">&larr; Back</a>
            <div class="detail-actions">
              <a href="#/contacts/${id}/edit" class="btn btn-secondary">Edit</a>
              <button id="delete-contact" class="btn btn-danger">Del</button>
            </div>
          </div>
          <div class="detail-title">
            <h1>${esc(contact.first_name)} ${esc(contact.last_name)}</h1>
          </div>
        </div>

        <div class="compact-meta">${metaParts.join(' · ')}</div>

        <div class="detail-grid">
          <div class="detail-main">
            ${contact.notes ? `<div class="card"><pre class="notes-pre">${esc(contact.notes)}</pre></div>` : ''}

            <div class="card activity-card">
              <h2>Activity <span class="badge">${activityList.length}</span></h2>
              <form id="activity-form" class="activity-form">
                <div class="activity-input-row">
                  <textarea id="activity-content" class="input" placeholder="Add note..." rows="2" required></textarea>
                  <select id="activity-deal" class="input">
                    <option value="">No project</option>
                    ${(deals || []).map(d => `<option value="${d.id}">${esc(d.title)}</option>`).join('')}
                  </select>
                </div>
                <button type="submit" class="btn btn-primary">Add</button>
              </form>

              <div class="activity-timeline">
                ${activityList.length === 0
                  ? '<div class="empty-state">No activity.</div>'
                  : activityList.map(a => `
                    <div class="activity-item" data-id="${a.id}">
                      <div class="activity-meta">
                        ${a.deals?.title ? `<span class="activity-project-badge">${esc(a.deals.title)}</span>` : ''}
                        <span class="activity-time">${timeAgo(a.created_at)}</span>
                        <button class="btn-icon delete-activity" data-id="${a.id}" title="Del">&times;</button>
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

    // Delete contact
    container.querySelector('#delete-contact').addEventListener('click', async () => {
      if (!confirm(`Delete "${contact.first_name} ${contact.last_name}"?`)) return;
      const { error: delErr } = await sb.from('contacts').delete().eq('id', id);
      if (delErr) { alert('Error: ' + delErr.message); return; }
      window.location.hash = '#/contacts';
    });

    // Add activity
    container.querySelector('#activity-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = container.querySelector('#activity-content').value.trim();
      if (!content) return;
      const dealId = container.querySelector('#activity-deal').value || null;
      const user = (await sb.auth.getUser()).data.user;
      const { error: insErr } = await sb.from('activities').insert({
        contact_id: id,
        user_id: user.id,
        deal_id: dealId,
        content,
      });
      if (insErr) { alert('Error: ' + insErr.message); return; }
      await renderContactDetail(container, id);
    });

    // Delete activity
    container.querySelectorAll('.delete-activity').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this entry?')) return;
        const { error: delErr } = await sb.from('activities').delete().eq('id', btn.dataset.id);
        if (delErr) { alert('Error: ' + delErr.message); return; }
        await renderContactDetail(container, id);
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

function escapeAttr(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
