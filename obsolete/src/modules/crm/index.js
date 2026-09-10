// CRM module — wraps existing CRM functionality
// Routes: #/crm, #/crm/contacts/..., #/crm/projects/..., #/crm/companies/...

import { renderContacts } from '../../ui/contacts.js';
import { renderContactDetail } from '../../ui/contactDetail.js';
import { renderContactForm } from '../../ui/contactForm.js';
import { renderCompanies } from '../../ui/companies.js';
import { renderCompanyDetail } from '../../ui/companyDetail.js';
import { renderCompanyForm } from '../../ui/companyForm.js';
import { renderProjects } from '../../ui/projects.js';
import { renderProjectDetail } from '../../ui/projectDetail.js';
import { renderProjectForm } from '../../ui/projectForm.js';
import { renderDashboard } from '../../ui/dashboard.js';
import { renderExtra } from '../../ui/extra.js';
import { renderCombo } from '../../ui/combo.js';
import { renderHeroes } from '../../ui/heroes.js';

// Route within CRM module
// parts = segments after 'crm/', e.g. ['contacts', '123']
export async function routeCRM(container, parts) {
  if (parts[0] === 'contacts' && parts[1] === 'new') {
    await renderContactForm(container);
  } else if (parts[0] === 'contacts' && parts[1] && parts[2] === 'edit') {
    await renderContactForm(container, parts[1]);
  } else if (parts[0] === 'contacts' && parts[1]) {
    await renderContactDetail(container, parts[1]);
  } else if (parts[0] === 'contacts') {
    await renderContacts(container);
  } else if (parts[0] === 'companies' && parts[1] === 'new') {
    await renderCompanyForm(container);
  } else if (parts[0] === 'companies' && parts[1] && parts[2] === 'edit') {
    window.location.hash = `#/crm/companies/${parts[1]}`;
  } else if (parts[0] === 'companies' && parts[1]) {
    await renderCompanyDetail(container, parts[1]);
  } else if (parts[0] === 'companies') {
    await renderCompanies(container);
  } else if (parts[0] === 'projects' && parts[1] === 'new') {
    await renderProjectForm(container);
  } else if (parts[0] === 'projects' && parts[1] && parts[2] === 'edit') {
    await renderProjectForm(container, parts[1]);
  } else if (parts[0] === 'projects' && parts[1]) {
    await renderProjectDetail(container, parts[1]);
  } else if (parts[0] === 'projects') {
    await renderProjects(container);
  } else if (parts[0] === 'combo') {
    await renderCombo(container);
  } else if (parts[0] === 'heroes') {
    await renderHeroes(container);
  } else if (parts[0] === 'extra') {
    await renderExtra(container);
  } else {
    // CRM home = dashboard
    await renderDashboard(container);
  }
}

// Returns quick-entry context based on CRM route
export function getCRMContext(parts) {
  const ctx = {};
  if (parts[0] === 'contacts' && parts[1] && parts[1] !== 'new' && parts[2] !== 'edit') {
    ctx.contactId = parts[1];
  } else if (parts[0] === 'projects' && parts[1] && parts[1] !== 'new' && parts[2] !== 'edit') {
    ctx.projectId = parts[1];
  }
  return ctx;
}
