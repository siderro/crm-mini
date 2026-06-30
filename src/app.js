import { sb, getUser, onAuthChange, signOut } from './supabase.js';
import { getLogo } from './logo.js';
import { renderLogin } from './ui/auth.js';
import { renderContacts } from './ui/contacts.js';
import { renderContactDetail } from './ui/contactDetail.js';
import { renderContactForm } from './ui/contactForm.js';
import { renderCompanies } from './ui/companies.js';
import { renderCompanyDetail } from './ui/companyDetail.js';
import { renderCompanyForm } from './ui/companyForm.js';
import { renderProjects } from './ui/projects.js';
import { renderProjectDetail } from './ui/projectDetail.js';
import { renderProjectForm } from './ui/projectForm.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderExtra } from './ui/extra.js';
import { renderCombo } from './ui/combo.js';
import { renderHeroes } from './ui/heroes.js';
import { renderQuickEntry } from './ui/quickEntry.js';

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

async function route() {
  if (!currentUser) {
    brand.style.display = 'none';
    quickEntryEl.style.display = 'none';
    renderLogin(app);
    return;
  }
  brand.style.display = '';
  quickEntryEl.style.display = '';
  await renderBrand();

  const parts = parseHash();

  if (parts[0] === 'contacts' && parts[1] === 'new') {
    await renderContactForm(app);
  } else if (parts[0] === 'contacts' && parts[1] && parts[2] === 'edit') {
    await renderContactForm(app, parts[1]);
  } else if (parts[0] === 'contacts' && parts[1]) {
    await renderContactDetail(app, parts[1]);
  } else if (parts[0] === 'companies' && parts[1] === 'new') {
    await renderCompanyForm(app);
  } else if (parts[0] === 'companies' && parts[1] && parts[2] === 'edit') {
    window.location.hash = `#/companies/${parts[1]}`;
  } else if (parts[0] === 'companies' && parts[1]) {
    await renderCompanyDetail(app, parts[1]);
  } else if (parts[0] === 'companies') {
    await renderCompanies(app);
  } else if (parts[0] === 'projects' && parts[1] === 'new') {
    await renderProjectForm(app);
  } else if (parts[0] === 'projects' && parts[1] && parts[2] === 'edit') {
    await renderProjectForm(app, parts[1]);
  } else if (parts[0] === 'projects' && parts[1]) {
    await renderProjectDetail(app, parts[1]);
  } else if (parts[0] === 'projects') {
    await renderProjects(app);
  } else if (parts[0] === 'contacts') {
    await renderContacts(app);
  } else if (parts[0] === 'combo') {
    await renderCombo(app);
  } else if (parts[0] === 'heroes') {
    await renderHeroes(app);
  } else if (parts[0] === 'extra') {
    await renderExtra(app);
  } else {
    await renderDashboard(app);
  }

  // Quick entry with context
  const qeContext = {};
  if (parts[0] === 'contacts' && parts[1] && parts[1] !== 'new' && parts[2] !== 'edit') {
    qeContext.contactId = parts[1];
  } else if (parts[0] === 'projects' && parts[1] && parts[1] !== 'new' && parts[2] !== 'edit') {
    qeContext.projectId = parts[1];
  }
  renderQuickEntry(quickEntryEl, qeContext);
}

async function renderBrand() {
  const hash = window.location.hash || '#/';

  let projectsSumText = '';
  try {
    const { data: openProjects } = await sb.from('projects').select('amount').in('status', ['open']);
    const total = (openProjects || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalK = Math.round(total / 1000);
    if (totalK > 0) projectsSumText = `${totalK} $`;
  } catch (e) {}

  const now = new Date();
  const dateStr = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });

  const logo = getLogo();

  function navLink(href, label, metric) {
    const active = href === '#/' ? (hash === '#/' || hash === '') : hash.startsWith(href);
    const metricHtml = metric ? ` <span class="nav-metric${active ? ' nav-metric-active' : ''}">(${metric})</span>` : '';
    return `<a href="${href}" class="${active ? 'active' : ''}"><span class="nav-label">${label}</span>${metricHtml}</a>`;
  }

  brand.innerHTML = `
    <div class="brand-logo">${logo}</div>
    <div class="brand-name">CRM Brevis</div>
    <div class="brand-time">
      <div id="brand-date">${dateStr}</div>
      <div id="brand-time">${timeStr}</div>
      <div>${dayStr}</div>
    </div>
    <div class="brand-sep">────────────────</div>
    <div class="brand-nav">
      ${navLink('#/', 'Dashboard')}
      ${navLink('#/projects', 'Projects', projectsSumText)}
      ${navLink('#/contacts', 'Contacts')}
      ${navLink('#/companies', 'Companies')}
      ${navLink('#/heroes', 'Heroes')}
      ${navLink('#/combo', '+ Combo')}
      ${navLink('#/extra', 'Extra')}
    </div>
    <div class="brand-sep">────────────────</div>
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

  // Fill character
  const fill = brand.querySelector('.brand-fill');
  if (fill) {
    let chars = '';
    for (let i = 0; i < 500; i++) chars += '\u2591';
    fill.textContent = chars;
  }
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
