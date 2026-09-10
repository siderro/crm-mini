// Launchpad Editor — full featured, saves to Supabase
// Based on GreetingsPage editor.html aesthetic

import { sb } from '../../supabase.js';

const COLUMN_COLORS = ['#0891b2', '#16a34a', '#d97706', '#9333ea', '#dc2626'];

let data = []; // [{title, links: [{id, title, url}]}]
let dragFrom = null;
let edited = false;

function setState(text, type) {
  const el = document.getElementById('lp-editor-state');
  if (!el) return;
  el.textContent = text;
  el.className = 'lpe-state ' + type;
}

function markEdited() {
  edited = true;
  setState('edited', 'edited');
}

function timestamp() {
  return new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function toMd() {
  return data.map(col => {
    let s = '## ' + col.title;
    col.links.forEach(l => { s += '\n- [' + l.title + '](' + l.url + ')'; });
    return s;
  }).join('\n\n') + '\n';
}

function syncRawMd() {
  const el = document.getElementById('lpe-raw-md');
  if (el) el.value = toMd();
}

function onEdit() {
  syncRawMd();
  markEdited();
}

export async function openEditor(container, onSaved) {
  // Load from Supabase
  const { data: links } = await sb.from('home_links')
    .select('*')
    .order('column_index')
    .order('position');

  // Group into data structure
  data = [];
  const colMap = {};
  (links || []).forEach(l => {
    if (!(l.column_index in colMap)) {
      colMap[l.column_index] = data.length;
      data.push({ title: l.column_title, links: [] });
    }
    data[colMap[l.column_index]].links.push({
      id: l.id,
      title: l.title,
      url: l.url,
    });
  });

  edited = false;
  renderEditorPage(container, onSaved);
  setState('loaded @ ' + timestamp(), 'loaded');
}

function renderEditorPage(container, onSaved) {
  container.innerHTML = `
    <div class="lpe">
      <div class="lpe-header">
        <div class="lpe-title">Links Editor</div>
        <div class="lpe-header-right">
          <span class="lpe-state" id="lp-editor-state"></span>
          <button class="lpe-btn" id="lpe-copy-md">Copy MD</button>
          <button class="lpe-btn lpe-btn-primary" id="lpe-save">Save</button>
          <button class="lpe-btn" id="lpe-cancel">Cancel</button>
        </div>
      </div>
      <div class="lpe-columns" id="lpe-columns"></div>
      <div class="lpe-raw">
        <div class="lpe-raw-title">Raw MD</div>
        <textarea id="lpe-raw-md" readonly></textarea>
      </div>
    </div>
  `;

  renderColumns();

  container.querySelector('#lpe-save').addEventListener('click', async () => {
    await saveToSupabase();
    setState('saved @ ' + timestamp(), 'loaded');
    edited = false;
    if (onSaved) onSaved();
  });

  container.querySelector('#lpe-cancel').addEventListener('click', () => {
    if (onSaved) onSaved();
  });

  container.querySelector('#lpe-copy-md').addEventListener('click', () => {
    navigator.clipboard.writeText(toMd()).then(() => {
      setState('copied to clipboard', 'loaded');
    });
  });
}

function renderColumns() {
  const el = document.getElementById('lpe-columns');
  if (!el) return;
  el.innerHTML = '';

  data.forEach((col, ci) => {
    const div = document.createElement('div');
    div.className = 'lpe-col';

    // Column title
    const titleInput = document.createElement('input');
    titleInput.className = 'lpe-col-title';
    titleInput.style.color = COLUMN_COLORS[ci % COLUMN_COLORS.length];
    titleInput.value = col.title;
    titleInput.placeholder = 'Column title';
    titleInput.oninput = function() { col.title = this.value; onEdit(); };
    div.appendChild(titleInput);

    // Links
    col.links.forEach((link, li) => {
      const item = document.createElement('div');
      item.className = 'lpe-link-item';
      item.draggable = true;

      const t = document.createElement('input');
      t.className = 'lpe-input';
      t.value = link.title;
      t.placeholder = 'Title';
      t.oninput = function() { link.title = this.value; onEdit(); };

      const u = document.createElement('input');
      u.className = 'lpe-input';
      u.value = link.url;
      u.placeholder = 'URL';
      u.oninput = function() { link.url = this.value; onEdit(); };

      const actions = document.createElement('div');
      actions.className = 'lpe-actions';

      const up = document.createElement('span');
      up.textContent = '\u2191';
      up.className = 'lpe-act';
      up.onclick = () => {
        if (li > 0) { col.links.splice(li, 1); col.links.splice(li - 1, 0, link); renderColumns(); markEdited(); }
      };

      const dn = document.createElement('span');
      dn.textContent = '\u2193';
      dn.className = 'lpe-act';
      dn.onclick = () => {
        if (li < col.links.length - 1) { col.links.splice(li, 1); col.links.splice(li + 1, 0, link); renderColumns(); markEdited(); }
      };

      const del = document.createElement('span');
      del.textContent = '\u00d7';
      del.className = 'lpe-act lpe-act-del';
      del.onmouseenter = () => item.classList.add('lpe-warn-delete');
      del.onmouseleave = () => item.classList.remove('lpe-warn-delete');
      del.onclick = () => { col.links.splice(li, 1); renderColumns(); markEdited(); };

      actions.appendChild(up);
      actions.appendChild(dn);
      actions.appendChild(del);

      item.appendChild(t);
      item.appendChild(u);
      item.appendChild(actions);

      // Drag and drop
      item.addEventListener('dragstart', () => {
        dragFrom = { col: ci, idx: li };
        item.classList.add('lpe-dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('lpe-dragging'));
      item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('lpe-drag-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('lpe-drag-over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('lpe-drag-over');
        if (!dragFrom) return;
        const moved = data[dragFrom.col].links.splice(dragFrom.idx, 1)[0];
        const targetIdx = (dragFrom.col === ci && dragFrom.idx < li) ? li - 1 : li;
        data[ci].links.splice(targetIdx, 0, moved);
        dragFrom = null;
        renderColumns();
        markEdited();
      });

      div.appendChild(item);
    });

    // Add link button
    const addBtn = document.createElement('button');
    addBtn.className = 'lpe-add-link';
    addBtn.textContent = '+ link';
    addBtn.onclick = () => {
      col.links.push({ id: null, title: '', url: '' });
      renderColumns();
      markEdited();
      const items = div.querySelectorAll('.lpe-link-item');
      const last = items[items.length - 1];
      if (last) last.querySelector('input').focus();
    };
    div.appendChild(addBtn);

    el.appendChild(div);
  });

  // Add column button at the end
  const addCol = document.createElement('div');
  addCol.className = 'lpe-add-col';
  const addColBtn = document.createElement('button');
  addColBtn.className = 'lpe-add-link';
  addColBtn.textContent = '+ column';
  addColBtn.onclick = () => {
    data.push({ title: '', links: [] });
    renderColumns();
    markEdited();
  };
  addCol.appendChild(addColBtn);
  el.appendChild(addCol);

  syncRawMd();
}

async function saveToSupabase() {
  const user = (await sb.auth.getUser()).data.user;
  if (!user) return;

  // Delete all existing
  await sb.from('home_links').delete().eq('user_id', user.id);

  // Insert new
  const inserts = [];
  data.forEach((col, ci) => {
    col.links.forEach((link, pos) => {
      if (link.title.trim() || link.url.trim()) {
        inserts.push({
          user_id: user.id,
          column_index: ci,
          column_title: col.title,
          title: link.title,
          url: link.url,
          position: pos,
        });
      }
    });
  });

  if (inserts.length > 0) {
    await sb.from('home_links').insert(inserts);
  }
}
