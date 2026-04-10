import { sb, getUser, onAuthChange, signOut } from './supabase.js';
import { renderLogin } from './ui/auth.js';
import { renderContacts } from './ui/contacts.js';
import { renderContactDetail } from './ui/contactDetail.js';
import { renderContactForm } from './ui/contactForm.js';
import { renderCompanies } from './ui/companies.js';
import { renderCompanyDetail } from './ui/companyDetail.js';
import { renderCompanyForm } from './ui/companyForm.js';
import { renderInbox } from './ui/inbox.js';
import { renderDeals } from './ui/deals.js';
import { renderDealDetail } from './ui/dealDetail.js';
import { renderDealForm } from './ui/dealForm.js';

const app = document.getElementById('app');
let currentUser = null;

// ── Router ──

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
  } else if (parts[0] === 'deals' && parts[1] === 'new') {
    await renderDealForm(app);
  } else if (parts[0] === 'deals' && parts[1] && parts[2] === 'edit') {
    await renderDealForm(app, parts[1]);
  } else if (parts[0] === 'deals' && parts[1]) {
    await renderDealDetail(app, parts[1]);
  } else if (parts[0] === 'deals') {
    await renderDeals(app);
  } else {
    // Default: contacts list
    await renderContacts(app);
  }
}

async function renderNav() {
  const nav = document.getElementById('nav');
  const hash = window.location.hash || '#/';

  // Get open deals sum
  let dealsSumText = '';
  try {
    const { data: openDeals } = await sb.from('deals')
      .select('amount')
      .in('status', ['OPP', 'proposal_sent', 'negotiation']);

    const totalAmount = (openDeals || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalInK = Math.round(totalAmount / 1000);
    dealsSumText = ` (${totalInK}k)`;
  } catch (err) {
    dealsSumText = '';
  }

  nav.innerHTML = `
    <div class="nav-inner">
      <div class="nav-left">
        <a href="#/" class="nav-brand">CRM Mini</a>
        <a href="#/inbox" class="nav-link${hash.startsWith('#/inbox') ? ' active' : ''}">Inbox</a>
        <a href="#/deals" class="nav-link${hash.startsWith('#/deals') ? ' active' : ''}">Deals${dealsSumText}</a>
        <a href="#/contacts" class="nav-link${hash.startsWith('#/contacts') || hash === '#/' || hash === '#' ? ' active' : ''}">Contacts</a>
        <a href="#/companies" class="nav-link${hash.startsWith('#/companies') ? ' active' : ''}">Companies</a>
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

// ── Init ──

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
