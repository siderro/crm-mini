import { esc } from '../util.js';

/** Hub. Dlaždice se generují jen z modulů, na které má člověk přístup. */
export function renderHome(mount, modules) {
  renderTiles(mount, 'Hub', modules, 'Nemáš zapnutý žádný modul.');
}

/** Nastavení — stejné dlaždice, jen pro moduly schované mimo hlavní navigaci. */
export function renderSettings(mount, modules) {
  renderTiles(mount, 'Nastavení', modules, 'Nemáš tu nic k nastavení.');
}

/**
 * Modul může do své dlaždice přidat obsah dvěma způsoby:
 *
 *   tileInfo()   → { badge, alert: { text, tone } }
 *       Číslo se tiše přilepí za nadpis, dole se ukáže jen to, co vyžaduje
 *       pozornost. Dlaždice zůstane jeden odkaz. Tohle chce většina modulů.
 *
 *   renderTile(el)
 *       Vlastní obsah včetně ovládání (stopky). Taková dlaždice není jeden
 *       velký odkaz — jinak by klik na tlačítko odnavigoval pryč.
 */
function renderTiles(mount, title, modules, emptyText) {
  if (!modules.length) {
    mount.innerHTML = `<div class="home"><h1>${esc(title)}</h1>
      <div class="empty-state">${esc(emptyText)}</div></div>`;
    return;
  }

  const tiles = modules.map((m) => {
    const head = `
      <div class="tile-label">${esc(m.label)}<span class="tile-badge" data-badge="${esc(m.id)}"></span></div>
      <div class="tile-desc muted">${esc(m.desc || '')}</div>`;

    return m.renderTile
      ? `<div class="tile tile-live">
           <a href="#/${m.id}" class="tile-link">${head}</a>
           <div class="tile-extra" data-tile="${esc(m.id)}"></div>
         </div>`
      : `<a href="#/${m.id}" class="tile">${head}<div class="tile-alert" data-alert="${esc(m.id)}"></div></a>`;
  }).join('');

  mount.innerHTML = `
    <div class="home">
      <h1>${esc(title)}</h1>
      <div class="tiles">${tiles}</div>
    </div>`;

  for (const m of modules) {
    if (m.renderTile) {
      const el = mount.querySelector(`[data-tile="${CSS.escape(m.id)}"]`);
      if (el) m.renderTile(el);
    } else if (m.tileInfo) {
      fillInfo(mount, m);
    }
  }
}

/** Doplní číslo a případný alert, až data dorazí. Když se to nepovede, mlčí. */
async function fillInfo(mount, module) {
  let info;
  try {
    info = await module.tileInfo();
  } catch {
    return;   // dlaždice zůstane holá; chyby se řeší uvnitř modulu
  }
  if (!info) return;

  const badge = mount.querySelector(`[data-badge="${CSS.escape(module.id)}"]`);
  if (badge && info.badge) badge.textContent = ` (${info.badge})`;

  const alert = mount.querySelector(`[data-alert="${CSS.escape(module.id)}"]`);
  if (alert && info.alert?.text) {
    alert.textContent = info.alert.text;
    alert.className = `tile-alert tone-${info.alert.tone || 'muted'}`;
  }
}
