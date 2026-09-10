// Hub — app home page
// Layout: left column (logo, time, service links) + right area (module tiles, calendar)

import { getLogo } from '../../logo.js';
import { sb, signOut } from '../../supabase.js';

const MODULES = [
  { id: 'crm', label: 'CRM', desc: 'Deals & pipeline', hash: '#/crm' },
  { id: 'todo', label: 'To-do', desc: 'Personal tasks', hash: '#/todo' },
  { id: 'pm', label: 'Projects', desc: 'Profitability', hash: '#/pm' },
  { id: 'contacts', label: 'Contacts', desc: 'People & notes', hash: '#/contacts' },
  { id: 'launchpad', label: 'Launchpad', desc: 'Chrome new tab', hash: '#/launchpad' },
  { id: 'admin', label: 'Admin', desc: 'Permissions', hash: '#/admin' },
];

export async function renderHome(container) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayStr = now.toLocaleDateString('cs-CZ', { weekday: 'long' });

  const logo = getLogo();
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const envLabel = isLocal ? 'LOCAL' : location.hostname;

  const user = (await sb.auth.getUser()).data.user;
  const email = user ? user.email : '';

  container.innerHTML = `
    <div class="hub">
      <div class="hub-sidebar">
        <div class="hub-logo">${logo}</div>
        <div class="hub-env ${isLocal ? 'env-local' : 'env-prod'}">${envLabel}</div>
        <div class="hub-sep"></div>
        <div class="hub-datetime">
          <div id="hub-date">${dateStr}</div>
          <div id="hub-day">${dayStr}</div>
          <div id="hub-time">${timeStr}</div>
        </div>
        <div class="hub-sep"></div>
        <div class="hub-service">
          <a href="#/crm/extra" class="hub-service-link">Extra</a>
          <a href="#/launchpad" class="hub-service-link">Launchpad</a>
        </div>
        <div class="hub-sep"></div>
        <div class="hub-user">
          ${esc(email)}<br>
          <a href="#" class="hub-service-link" id="hub-sign-out">Sign out</a>
        </div>
        <div class="hub-fill"></div>
      </div>
      <div class="hub-main">
        <div class="hub-modules">
          ${MODULES.map(m => `
            <a href="${m.hash}" class="hub-tile" data-module="${m.id}">
              <span class="hub-tile-label">${m.label}</span>
              <span class="hub-tile-desc">${m.desc}</span>
            </a>
          `).join('')}
        </div>
        <div class="hub-calendar">
          <div class="hub-section-title">Calendar</div>
          <div class="hub-calendar-placeholder">(Google Calendar — coming soon)</div>
        </div>
      </div>
    </div>
  `;

  // Sign out
  container.querySelector('#hub-sign-out').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
    window.location.hash = '#/';
  });

  // Live clock
  setInterval(() => {
    const n = new Date();
    const dateEl = document.getElementById('hub-date');
    const timeEl = document.getElementById('hub-time');
    const dayEl = document.getElementById('hub-day');
    if (dateEl) dateEl.textContent = n.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (timeEl) timeEl.textContent = n.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dayEl) dayEl.textContent = n.toLocaleDateString('cs-CZ', { weekday: 'long' });
  }, 1000);
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
