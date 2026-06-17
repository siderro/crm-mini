import { sb } from '../supabase.js';
import { timeAgo } from '../utils/time.js';
import { deleteWithUndo } from '../utils/undo.js';

export async function renderContactDetail(container, id) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const { data: contact, error } = await sb.from('contacts').select('*, companies(id, name)').eq('id', id).single();

    if (error || !contact) {
      container.innerHTML = '<div class="error">Contact not found. <a href="#/contacts">Back to list</a></div>';
      return;
    }

    // Build compact metadata line
    const metaParts = [];
    if (contact.email) metaParts.push(`Email: <a href="mailto:${escapeAttr(contact.email)}">${esc(contact.email)}</a>`);
    if (contact.phone) metaParts.push(`Phone: <a href="tel:${escapeAttr(contact.phone)}">${esc(contact.phone)}</a>`);
    if (contact.companies?.name) metaParts.push(`Company: ${esc(contact.companies.name)}`);
    metaParts.push(`Upd: ${timeAgo(contact.updated_at)}`);
    metaParts.push(`Add: ${timeAgo(contact.created_at)}`);

    container.innerHTML = `
      <div class="detail-page">
        <div class="detail-header">
          <div class="detail-toolbar">
            <a href="#/contacts" class="btn btn-back">&larr; Back</a>
            <h1>${esc(contact.first_name)} ${esc(contact.last_name)}</h1>
            <div class="detail-actions">
              <a href="#/contacts/${id}/edit" class="btn btn-secondary">Edit</a>
              <button id="delete-contact" class="btn btn-danger">Del</button>
            </div>
          </div>
        </div>

        <div class="compact-meta">${metaParts.join(' · ')}</div>

        <div class="detail-grid">
          <div class="detail-main">
            <div class="card">
              <div class="section-bar">Notes</div>
              <div class="notes-toolbar">
                <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
                <span id="notes-status"></span>
                <button id="save-notes-btn" class="btn btn-sm btn-primary">Save</button>
              </div>
              <textarea id="contact-notes" class="input notes-textarea" rows="10">${esc(contact.notes || '')}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;

    // Save notes
    container.querySelector('#save-notes-btn').addEventListener('click', async () => {
      const notes = container.querySelector('#contact-notes').value;
      const status = container.querySelector('#notes-status');
      const { error: updErr } = await sb.from('contacts').update({ notes: notes || null }).eq('id', id);
      if (updErr) {
        status.textContent = 'Error: ' + updErr.message;
        status.style.color = 'var(--danger, red)';
      } else {
        status.textContent = 'Saved';
        status.style.color = 'var(--success, green)';
        setTimeout(() => { status.textContent = ''; }, 2000);
      }
    });

    // Add timestamp
    container.querySelector('#add-timestamp-btn').addEventListener('click', () => {
      const textarea = container.querySelector('#contact-notes');
      const date = new Date().toLocaleDateString('cs-CZ');
      const pos = textarea.selectionStart;
      const val = textarea.value;
      const stamp = `\n[${date}] `;
      textarea.value = val.slice(0, pos) + stamp + val.slice(pos);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = pos + stamp.length;
    });

    // Delete contact
    container.querySelector('#delete-contact').addEventListener('click', async () => {
      await deleteWithUndo('contacts', contact, `"${contact.first_name} ${contact.last_name}"`,
        () => { window.location.hash = '#/contacts'; },
        () => { window.location.hash = `#/contacts/${id}`; }
      );
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
