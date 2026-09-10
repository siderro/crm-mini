import { sb, getUser, onAuthChange, signOut } from './supabase.js';
import { getLogo } from './logo.js';
import { renderLogin } from './ui/auth.js';
import { renderHome } from './modules/home/index.js';
import { routeCRM, getCRMContext } from './modules/crm/index.js';
import { renderTodo } from './modules/todo/index.js';
import { renderPM } from './modules/pm/index.js';
import { renderContacts as renderContactsModule } from './modules/contacts/index.js';
import { renderAdmin } from './modules/admin/index.js';
import { renderLaunchpad } from './modules/launchpad/index.js';
import { renderQuickEntry } from './ui/quickEntry.js';

const layout = document.getElementById('layout');
const app = document.getElementById('app');
const brand = document.getElementById('brand');
const quickEntryEl = document.getElementById('quick-entry');
let currentUser = null;
let clockInterval = null;

// -- Router --

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '') || '';
  return hash.split('/').filter(Boolean);
}

function getActiveModule(parts) {
  if (!parts.length) return 'home';
  return parts[0];
}

async function route() {
  if (!currentUser) {
    brand.style.display = 'none';
    quickEntryEl.style.display = 'none';
    layout.classList.add('layout-full');
    renderLogin(app);
    return;
  }

  const parts = parseHash();
  const module = getActiveModule(parts);
  const subParts = parts.slice(1);

  // Show/hide brand sidebar based on module
  if (module === 'home' || module === 'launchpad') {
    brand.style.display = 'none';
    quickEntryEl.style.display = 'none';
    layout.classList.add('layout-full');
  } else {
    brand.style.display = '';
    quickEntryEl.style.display = module === 'crm' ? '' : 'none';
    layout.classList.remove('layout-full');
    await renderBrand(module);
  }

  // Route to module
  switch (module) {
    case 'home':
      await renderHome(app);
      break;
    case 'crm':
      await routeCRM(app, subParts);
      renderQuickEntry(quickEntryEl, getCRMContext(subParts));
      break;
    case 'todo':
      renderTodo(app);
      break;
    case 'pm':
      renderPM(app);
      break;
    case 'contacts':
      renderContactsModule(app);
      break;
    case 'admin':
      renderAdmin(app);
      break;
    case 'launchpad':
      await renderLaunchpad(app);
      break;
    default:
      // Unknown route → home
      window.location.hash = '#/';
      return;
  }
}

async function renderBrand(activeModule) {
  const hash = window.location.hash || '#/';

  let projectsSumText = '';
  if (activeModule === 'crm') {
    try {
      const { data: openProjects } = await sb.from('projects').select('amount').in('status', ['open']);
      const total = (openProjects || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      const totalK = Math.round(total / 1000);
      if (totalK > 0) projectsSumText = `${totalK} $`;
    } catch (e) {}
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });

  const logo = getLogo();

  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const envLabel = isLocal ? 'LOCAL' : location.hostname;

  function navLink(href, label, metric) {
    const active = href === '#/crm' ? (hash === '#/crm' || hash === '#/crm/') : hash.startsWith(href);
    const metricHtml = metric ? ` <span class="nav-metric${active ? ' nav-metric-active' : ''}">(${metric})</span>` : '';
    return `<a href="${href}" class="${active ? 'active' : ''}"><span class="nav-label">${label}</span>${metricHtml}</a>`;
  }

  // Build nav based on active module
  let navHtml = '';
  if (activeModule === 'crm') {
    navHtml = `
      ${navLink('#/crm', 'Dashboard')}
      ${navLink('#/crm/contacts', 'Contacts')}
      ${navLink('#/crm/projects', 'Projects', projectsSumText)}
      ${navLink('#/crm/companies', 'Companies')}
      ${navLink('#/crm/heroes', 'Heroes')}
      ${navLink('#/crm/combo', '+ Combo')}
      ${navLink('#/crm/extra', 'Extra')}
    `;
  }

  brand.innerHTML = `
    <div class="brand-logo">${logo}</div>
    <div class="brand-env ${isLocal ? 'env-local' : 'env-prod'}">${envLabel}</div>
    <div class="brand-time">
      <div id="brand-date">${dateStr}</div>
      <div id="brand-time">${timeStr}</div>
      <div>${dayStr}</div>
    </div>
    <div class="brand-sep"></div>
    <a href="#/" class="brand-home-link">← Home</a>
    <div class="brand-sep"></div>
    <div class="brand-nav">
      ${navHtml}
    </div>
    ${navHtml ? '<div class="brand-sep"></div>' : ''}
    <div class="brand-user">
      ${esc(currentUser.email)}<br>
      <a id="sign-out-link" href="#">Sign out</a>
    </div>
    <div class="brand-fill"></div>
  `;

  // Sign out
  brand.querySelector('#sign-out-link').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
    window.location.hash = '#/';
  });

  // Live clock
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    const n = new Date();
    const dateEl = document.getElementById('brand-date');
    const timeEl = document.getElementById('brand-time');
    if (dateEl) dateEl.textContent = n.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (timeEl) timeEl.textContent = n.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, 1000);

}

// -- Init --

onAuthChange((user) => {
  currentUser = user;
  route();
});

window.addEventListener('hashchange', () => {
  if (currentUser) route();
});

(async () => {
  currentUser = await getUser();
  route();
})();

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
