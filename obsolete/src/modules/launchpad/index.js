// Launchpad — Chrome new tab page
// Aesthetic: GreetingsPage style (colored columns, hostname, fill chars)
// Data: Supabase `home_links` table

import { sb } from '../../supabase.js';
import { getLogo } from '../../logo.js';
import { openEditor } from './editor.js';

const COLUMN_COLORS = ['cyan', 'green', 'yellow', 'magenta', 'red'];

export async function renderLaunchpad(container) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayStr = now.toLocaleDateString('cs-CZ', { weekday: 'long' });

  const logo = getLogo();

  // Load links
  const { data: links } = await sb.from('home_links')
    .select('*')
    .order('column_index')
    .order('position');

  // Group by column
  const columns = {};
  (links || []).forEach(l => {
    if (!columns[l.column_index]) columns[l.column_index] = { title: l.column_title, links: [] };
    columns[l.column_index].links.push(l);
  });

  const colKeys = Object.keys(columns).sort((a, b) => a - b);

  container.innerHTML = `
    <div class="lp" style="grid-template-columns: 1fr repeat(${colKeys.length || 1}, 1fr)">
      <div class="lp-brand">
        <div class="lp-logo">${logo}</div>
        <div class="lp-name">Launchpad</div>
        <div class="lp-sep"></div>
        <div class="lp-datetime">
          <div id="lp-date">${dateStr}</div>
          <div id="lp-day">${dayStr}</div>
          <div id="lp-time">${timeStr}</div>
        </div>
        <div class="lp-sep"></div>
        <a href="#" class="lp-editor-link" id="lp-edit-toggle">Editor</a>
        <a href="#/" class="lp-editor-link">Hub</a>
        <a href="#/crm/extra" class="lp-editor-link">Extra</a>
        <div class="lp-fill"></div>
      </div>

      ${colKeys.length === 0
        ? '<div class="lp-col"><div class="lp-empty">No links. Click Editor to add.</div></div>'
        : colKeys.map((ci, idx) => {
          const col = columns[ci];
          const color = COLUMN_COLORS[idx % COLUMN_COLORS.length];
          return `
            <div class="lp-col lp-color-${color}">
              <div class="lp-col-title">${esc(col.title)}</div>
              ${col.links.filter(l => l.title !== '(placeholder)').map(l => {
                let hostname = '';
                try { hostname = new URL(l.url).hostname; } catch(e) { hostname = l.url; }
                return `
                  <a href="${esc(l.url)}" class="lp-link" target="_blank">${esc(l.title)}</a>
                  <div class="lp-link-host">${esc(hostname)}</div>
                `;
              }).join('')}
              <div class="lp-fill"></div>
            </div>
          `;
        }).join('')
      }
    </div>

  `;

  // Live clock
  setInterval(() => {
    const n = new Date();
    const dateEl = document.getElementById('lp-date');
    const timeEl = document.getElementById('lp-time');
    const dayEl = document.getElementById('lp-day');
    if (dateEl) dateEl.textContent = n.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (timeEl) timeEl.textContent = n.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dayEl) dayEl.textContent = n.toLocaleDateString('cs-CZ', { weekday: 'long' });
  }, 1000);

  // Editor toggle — opens full editor page
  container.querySelector('#lp-edit-toggle').addEventListener('click', (e) => {
    e.preventDefault();
    openEditor(container, () => renderLaunchpad(container));
  });
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
