import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';

export async function renderContactDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const [{ data: contact, error }, { data: activities }] = await Promise.all([
      sb.from('contacts').select('*, companies(id, name)').eq('id', id).single(),
      sb.from('activities').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    ]);

    if (error || !contact) {
      container.innerHTML = '<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';
      return;
    }

    const activityList = activities || [];

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <a href="#/contacts" class="btn btn-back">&larr; Back</a>
          <div class="detail-title">
            <h1>${esc(contact.first_name)} ${esc(contact.last_name)}</h1>
            ${contact.companies?.name ? `<span class="company-tag">${esc(contact.companies.name)}</span>` : ''}
          </div>
          <div class="detail-actions">
            <a href="#/contacts/${id}/edit" class="btn btn-secondary">Edit</a>
            <button id="delete-contact" class="btn btn-danger">Delete</button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-main">
            <div class="card info-card">
              <h2>Contact Information</h2>
              <div class="info-grid">
                <div class="info-item">
                  <label>Email</label>
                  <span>${contact.email ? `<a href="mailto:${escapeAttr(contact.email)}">${esc(contact.email)}</a>` : '<span class="muted">Not set</span>'}</span>
                </div>
                <div class="info-item">
                  <label>Phone</label>
                  <span>${contact.phone ? `<a href="tel:${escapeAttr(contact.phone)}">${esc(contact.phone)}</a>` : '<span class="muted">Not set</span>'}</span>
                </div>
                <div class="info-item">
                  <label>Company</label>
                  <span>${contact.companies?.name ? esc(contact.companies.name) : '<span class="muted">None</span>'}</span>
                </div>
                <div class="info-item">
                  <label>Created</label>
                  <span>${new Date(contact.created_at).toLocaleDateString()} (${timeAgo(contact.created_at)})</span>
                </div>
                <div class="info-item">
                  <label>Updated</label>
                  <span>${new Date(contact.updated_at).toLocaleDateString()} (${timeAgo(contact.updated_at)})</span>
                </div>
              </div>
              ${contact.notes ? `<div class="contact-notes"><label>Notes</label><p>${esc(contact.notes).replace(/\n/g, '<br>')}</p></div>` : ''}
            </div>

            <div class="card activity-card">
              <h2>Activity Log <span class="badge">${activityList.length}</span></h2>
              <form id="activity-form" class="activity-form">
                <div class="activity-input-row">
                  <select id="activity-type" class="input">
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                  <textarea id="activity-content" class="input" placeholder="Add a note, log a call..." rows="2" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Add Entry</button>
              </form>

              <div class="activity-timeline">
                ${activityList.length === 0
                  ? '<div class="empty-state">No activity yet.</div>'
                  : activityList.map(a => `
                    <div class="activity-item" data-id="${a.id}">
                      <div class="activity-meta">
                        <span class="activity-type-badge type-${a.type}">${esc(a.type)}</span>
                        <span class="activity-time">${timeAgo(a.created_at)}</span>
                        <button class="btn-icon delete-activity" data-id="${a.id}" title="Delete">&times;</button>
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
      if (!confirm(`Delete "${contact.first_name} ${contact.last_name}"? This cannot be undone.`)) return;
      const { error: delErr } = await sb.from('contacts').delete().eq('id', id);
      if (delErr) { alert('Error: ' + delErr.message); return; }
      window.location.hash = '#/contacts';
    });

    // Add activity
    container.querySelector('#activity-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = container.querySelector('#activity-content').value.trim();
      if (!content) return;
      const type = container.querySelector('#activity-type').value;
      const user = (await sb.auth.getUser()).data.user;
      const { error: insErr } = await sb.from('activities').insert({
        contact_id: id,
        user_id: user.id,
        type,
        content,
      });
      if (insErr) { alert('Error: ' + insErr.message); return; }
      await renderContactDetail(container, id);
    });

    // Delete activity
    container.querySelectorAll('.delete-activity').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this activity entry?')) return;
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
