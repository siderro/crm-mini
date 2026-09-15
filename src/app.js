import { onAuthChange, signOut } from './supabase.js';
import { esc } from './util.js';
import { renderLogin } from './login.js';
import { renderHome, renderSettings } from './modules/home.js';
import { renderWaiting } from './modules/waiting.js';
import { renderDenied } from './modules/denied.js';
import { MODULES, MODULE_BY_ID } from './modules/registry.js';
import { people } from './modules/people/index.js';
import { buildSession, canAccess, canEdit } from './session.js';

let session = null;
let deniedEmail = null;   // přežije odhlášení, aby šlo vysvětlit, proč to skončilo
const root = document.getElementById('root');

// ── Routing ──

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');   // "crm/contacts/123"
  return raw ? raw.split('/').filter(Boolean) : [];
}

/** Všechny moduly, na které tenhle člověk dosáhne. Pořadí = pořadí registru. */
function myModules() {
  const mods = MODULES.filter((m) => canAccess(session, m.id));
  if (session.isSuperadmin) mods.push(people);
  return mods;
}

/** Do horní navigace a na hub patří jen pracovní moduly. */
function navModules() {
  return myModules().filter((m) => !m.settings);
}

/** Zbytek — správa, ne každodenní práce — bydlí pod Nastavením. */
function settingsModules() {
  return myModules().filter((m) => m.settings);
}

function route() {
  if (!session) { renderLogin(root); return; }
  if (session.state === 'waiting') { renderWaiting(root, session, doSignOut); return; }

  const segments = parseHash();
  const moduleId = segments[0] || 'home';

  renderShell(moduleId);
  const view = document.getElementById('view');

  if (moduleId === 'home') {
    renderHome(view, navModules());
    return;
  }

  if (moduleId === 'settings') {
    renderSettings(view, settingsModules());
    return;
  }

  const mod = moduleId === 'people' ? people : MODULE_BY_ID[moduleId];
  if (!mod) {
    view.innerHTML = `<div class="empty-state">Neznámý modul: ${esc(moduleId)}. <a href="#/">Zpět na hub</a></div>`;
    return;
  }

  // Zamčeno se musí zamknout, ne jen schovat odkaz — zadání hashe rukou sem taky patří.
  if (!canAccess(session, mod.id)) {
    view.innerHTML = `<div class="empty-state">Do modulu „${esc(mod.label)}" nemáš přístup. <a href="#/">Zpět na hub</a></div>`;
    return;
  }

  // Modul dostane kontext, ne celou session — ať se práva řeší na jednom místě.
  mod.render(view, segments.slice(1), { email: session.email, canEdit: canEdit(session, mod.id) });
}

// ── Shell (persistent header + content mount) ──

function renderShell(activeModuleId) {
  const nav = navModules().map((m) =>
    `<a href="#/${m.id}" class="topnav-link${m.id === activeModuleId ? ' active' : ''}">${esc(m.label)}</a>`
  ).join('');

  // „Nastavení" svítí i když jsem uvnitř některého z jeho modulů.
  const settings = settingsModules();
  const inSettings = activeModuleId === 'settings' || settings.some((m) => m.id === activeModuleId);
  const settingsLink = settings.length
    ? `<a href="#/settings" class="topnav-link${inSettings ? ' active' : ''}">Nastavení</a>`
    : '';

  root.innerHTML = `
    <header class="topbar">
      <a href="#/" class="brand">Brevis</a>
      <nav class="topnav">${nav}</nav>
      ${activeModuleId === 'home' ? '' : `<div id="topbar-mini"></div>`}
      <div class="topbar-user">
        ${settingsLink}
        <span class="muted">${esc(session.email)}</span>
        <a href="#" id="sign-out">Odhlásit</a>
      </div>
    </header>
    <main id="view" class="view"></main>
  `;

  // Modul může do hlavičky vložit připomínku (běžící stopky). Na hubu ne —
  // tam je celá dlaždice a připomínat by se nemělo co.
  const mini = root.querySelector('#topbar-mini');
  if (mini) {
    for (const m of myModules()) if (m.renderMini) m.renderMini(mini);
  }

  root.querySelector('#sign-out').addEventListener('click', (e) => {
    e.preventDefault();
    doSignOut();
  });
}

async function doSignOut() {
  // Session zahodíme hned, aby změna hashe pod námi nestihla překreslit starý stav.
  session = null;
  try {
    await signOut();
  } finally {
    location.hash = '#/';
  }
}

// ── Auth gate ──

async function handleUser(user) {
  if (!user) {
    session = null;
    if (deniedEmail) {
      const email = deniedEmail;
      deniedEmail = null;
      renderDenied(root, email);
      return;
    }
    renderLogin(root);
    return;
  }

  // Supabase hlásí změnu autentizace i při pouhém návratu na záložku — ověří si
  // session a obnoví token. Kdyby se na to překreslovalo, přišel bys o všechno
  // rozepsané pokaždé, co přepneš do jiného tabu a zpátky. Když je přihlášený
  // pořád tentýž člověk, není co dělat.
  if (session && session.email === (user.email || '').trim().toLowerCase()) return;

  let next;
  try {
    next = await buildSession(user);
  } catch (err) {
    // Bez databáze nevíme, kam člověk smí — pustit ho dovnitř by bylo horší.
    session = null;
    root.innerHTML = `<div class="login"><div class="login-card gate-card">
      <h1>Nejde se připojit</h1>
      <p>${esc(err.message)}</p>
      <button class="btn" onclick="location.reload()">Zkusit znovu</button>
    </div></div>`;
    return;
  }

  if (next.state === 'denied') {
    // Účet mimo doménu dovnitř nepustíme ani na okamžik: nejdřív vysvětlení,
    // pak odhlášení na pozadí. `deniedEmail` drží zprávu i přes handleUser(null),
    // který odhlášení spustí — a nezůstane viset, kdyby signOut() selhal.
    session = null;
    deniedEmail = next.email;
    renderDenied(root, next.email);
    try { await signOut(); } catch { /* i tak je dovnitř nepustíme */ }
    return;
  }

  session = next;
  route();
}

// ── Init ──

root.innerHTML = `<div class="login"><div class="login-card"><div class="loading">Načítám…</div></div></div>`;

// Poslední záchranná síť. Kdyby někde chyba proklouzla bez ošetření, nesmí
// skončit jen v konzoli — obrazovka by vypadala zamrzle a nikdo by nevěděl proč.
window.addEventListener('unhandledrejection', (e) => {
  const message = e.reason?.message || String(e.reason);
  let bar = document.getElementById('app-error');

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'app-error';
    bar.className = 'app-error';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span>Něco se nepovedlo: ${esc(message)}</span>
    <button class="btn" id="app-error-close">Zavřít</button>`;
  bar.querySelector('#app-error-close').addEventListener('click', () => bar.remove());
});

// Callback z onAuthStateChange se nemá blokovat vlastní async prací — odložíme ji.
onAuthChange((user) => { setTimeout(() => handleUser(user), 0); });
window.addEventListener('hashchange', () => { if (session) route(); });
