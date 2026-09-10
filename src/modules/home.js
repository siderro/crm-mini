import { esc } from '../util.js';

/** Hub. Dlaždice se generují jen z modulů, na které má člověk přístup. */
export function renderHome(mount, modules) {
  renderTiles(mount, 'Hub', modules, 'Nemáš zapnutý žádný modul.');
}

/** Nastavení — stejné dlaždice, jen pro moduly schované mimo hlavní navigaci. */
export function renderSettings(mount, modules) {
  renderTiles(mount, 'Nastavení', modules, 'Nemáš tu nic k nastavení.');
}

function renderTiles(mount, title, modules, emptyText) {
  if (!modules.length) {
    mount.innerHTML = `<div class="home"><h1>${esc(title)}</h1>
      <div class="empty-state">${esc(emptyText)}</div></div>`;
    return;
  }

  const tiles = modules.map(m => `
    <a href="#/${m.id}" class="tile">
      <div class="tile-label">${esc(m.label)}</div>
      <div class="tile-desc muted">${esc(m.desc || '')}</div>
    </a>
  `).join('');

  mount.innerHTML = `
    <div class="home">
      <h1>${esc(title)}</h1>
      <div class="tiles">${tiles}</div>
    </div>`;
}
