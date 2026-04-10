import { sb } from '../supabase.js';

export async function renderInbox(container, currentUser) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const { data } = await sb.from('inbox').select('content').eq('user_id', currentUser.id).single();
    const content = data?.content || '';

    container.innerHTML = `
      <div class="inbox-toolbar">
        <button id="add-timestamp-btn" class="btn btn-sm btn-secondary">Add timestamp</button>
        <div class="inbox-toolbar-right">
          <span id="inbox-status"></span>
          <button id="inbox-save" class="btn btn-primary">Save</button>
        </div>
      </div>
      <textarea id="inbox-content" class="input inbox-textarea">${esc(content)}</textarea>
    `;

    let rowExists = !!data;

    container.querySelector('#inbox-save').addEventListener('click', async () => {
      const val = container.querySelector('#inbox-content').value;
      const now = new Date().toISOString();
      let error;
      if (rowExists) {
        ({ error } = await sb.from('inbox').update({ content: val, updated_at: now }).eq('user_id', currentUser.id));
      } else {
        ({ error } = await sb.from('inbox').insert({ user_id: currentUser.id, content: val, updated_at: now }));
        if (!error) rowExists = true;
      }
      const status = container.querySelector('#inbox-status');
      if (error) {
        status.textContent = 'Error: ' + error.message;
        status.style.color = 'var(--danger)';
      } else {
        status.textContent = 'Saved \u2713';
        status.style.color = 'var(--success)';
        setTimeout(() => { status.textContent = ''; }, 2000);
      }
    });

    // Add timestamp
    container.querySelector('#add-timestamp-btn').addEventListener('click', () => {
      const textarea = container.querySelector('#inbox-content');
      const timestamp = formatTimestamp(new Date());
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(cursorPos);
      const newText = textBefore + (textBefore && !textBefore.endsWith('\n') ? '\n' : '') + timestamp + '\n' + textAfter;
      textarea.value = newText;
      const newCursorPos = textBefore.length + (textBefore && !textBefore.endsWith('\n') ? 1 : 0) + timestamp.length + 1;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function formatTimestamp(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
