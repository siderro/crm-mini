import { sb } from '../supabase.js';

const UNDO_TIMEOUT = 10000;
let activeUndo = null;

function getOrCreateContainer() {
  let el = document.getElementById('undo-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'undo-container';
    document.body.appendChild(el);
  }
  return el;
}

function clearActiveUndo() {
  if (!activeUndo) return;
  clearTimeout(activeUndo.timer);
  if (activeUndo.el && activeUndo.el.parentNode) {
    activeUndo.el.parentNode.removeChild(activeUndo.el);
  }
  activeUndo = null;
}

/**
 * Delete a row with undo support.
 * - Fetches a clean copy (no joins) before deleting
 * - Immediately deletes from DB and calls onDelete callback
 * - Shows floating undo box for 10s
 * - On undo: re-inserts the clean row and calls onRestore callback
 */
export async function deleteWithUndo(table, row, label, onDelete, onRestore) {
  clearActiveUndo();

  // Fetch clean row (only real columns, no joins) before deleting
  const { data: cleanRow, error: fetchErr } = await sb.from(table).select('*').eq('id', row.id).single();
  if (fetchErr || !cleanRow) { alert('Error: ' + (fetchErr?.message || 'Row not found')); return; }

  const { error } = await sb.from(table).delete().eq('id', row.id);
  if (error) { alert('Error: ' + error.message); return; }

  onDelete();

  const container = getOrCreateContainer();
  const el = document.createElement('div');
  el.className = 'undo-toast';
  el.innerHTML = `
    <span class="undo-text">Deleted ${label}</span>
    <a href="#" class="undo-link">Undo</a>
    <span class="undo-timer-bar"></span>
  `;
  container.appendChild(el);

  const undoLink = el.querySelector('.undo-link');
  const timerBar = el.querySelector('.undo-timer-bar');

  requestAnimationFrame(() => {
    timerBar.style.transition = `width ${UNDO_TIMEOUT}ms linear`;
    timerBar.style.width = '0%';
  });

  const timer = setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
    activeUndo = null;
  }, UNDO_TIMEOUT);

  activeUndo = { el, timer };

  undoLink.addEventListener('click', async (e) => {
    e.preventDefault();
    clearTimeout(timer);
    if (el.parentNode) el.parentNode.removeChild(el);
    activeUndo = null;

    const { error: insErr } = await sb.from(table).insert(cleanRow);
    if (insErr) { alert('Undo failed: ' + insErr.message); return; }

    onRestore();
  });
}
