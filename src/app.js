import { sb, getUser, onAuthChange, signOut } from './supabase.js';
import { renderLogin } from './ui/auth.js';
import { renderContacts } from './ui/contacts.js';
import { renderContactDetail } from './ui/contactDetail.js';
import { renderContactForm } from './ui/contactForm.js';
import { renderCompanies } from './ui/companies.js';
import { renderCompanyDetail } from './ui/companyDetail.js';
import { renderCompanyForm } from './ui/companyForm.js';
import { renderInbox } from './ui/inbox.js';
import { renderProjects } from './ui/projects.js';
import { renderProjectDetail } from './ui/projectDetail.js';
import { renderProjectForm } from './ui/projectForm.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderExtra } from './ui/extra.js';
import { renderCombo } from './ui/combo.js';

const app = document.getElementById('app');
let currentUser = null;

// -- Router --

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '') || '';
  const parts = hash.split('/').filter(Boolean);
  return parts;
}

async function route() {
  if (!currentUser) {
    document.getElementById('nav').style.display = 'none';
    renderLogin(app);
    return;
  }

  document.getElementById('nav').style.display = '';
  await renderNav();

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
    await renderCompanyForm(app, parts[1]);
  } else if (parts[0] === 'companies' && parts[1]) {
    await renderCompanyDetail(app, parts[1]);
  } else if (parts[0] === 'companies') {
    await renderCompanies(app);
  } else if (parts[0] === 'inbox') {
    await renderInbox(app, currentUser);
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
  } else if (parts[0] === 'extra') {
    await renderExtra(app);
  } else {
    // Default: dashboard
    await renderDashboard(app);
  }
}

async function renderNav() {
  const nav = document.getElementById('nav');
  const hash = window.location.hash || '#/';

  // Get open projects sum
  let projectsSumText = '';
  try {
    const { data: openProjects } = await sb.from('projects')
      .select('amount')
      .in('status', ['open']);

    const totalAmount = (openProjects || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalInK = Math.round(totalAmount / 1000);
    if (totalInK > 0) projectsSumText = ` (${totalInK}k)`;
  } catch (err) {
    projectsSumText = '';
  }

  nav.innerHTML = `
    <div class="nav-inner">
      <div class="nav-left">
        <a href="#/" class="nav-brand">CRM Mini</a>
        <a href="#/inbox" class="nav-link${hash.startsWith('#/inbox') ? ' active' : ''}">Inbox</a>
        <a href="#/projects" class="nav-link${hash.startsWith('#/projects') ? ' active' : ''}">Projects${projectsSumText}</a>
        <a href="#/contacts" class="nav-link${hash.startsWith('#/contacts') ? ' active' : ''}">Contacts</a>
        <a href="#/companies" class="nav-link${hash.startsWith('#/companies') ? ' active' : ''}">Companies</a>
        <a href="#/combo" class="nav-link${hash.startsWith('#/combo') ? ' active' : ''}">+ Combo</a>
        <a href="#/extra" class="nav-link${hash.startsWith('#/extra') ? ' active' : ''}">Extra</a>
      </div>
      <div class="nav-right">
        <span class="nav-user">${esc(currentUser.email)}</span>
        <button id="sign-out-btn" class="btn btn-sm btn-secondary">Sign out</button>
      </div>
    </div>
  `;
  nav.querySelector('#sign-out-btn').addEventListener('click', async () => {
    await signOut();
    window.location.hash = '#/';
  });
}

// -- Init --

onAuthChange((user) => {
  currentUser = user;
  route();
});

window.addEventListener('hashchange', () => {
  if (currentUser) route();
});

// Initial load
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
