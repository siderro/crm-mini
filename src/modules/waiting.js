// Čekárna — doménový účet, kterému super admin ještě nic nezapnul.
// Výchozí stav každého nového člověka.

import { esc, formatDate } from '../util.js';
import { SUPERADMIN_EMAIL } from '../config.js';

export function renderWaiting(mount, session, onSignOut) {
  mount.innerHTML = `
    <div class="login">
      <div class="login-card gate-card">
        <div class="login-logo">Brevis</div>
        <h1>Jsi zaregistrovaný</h1>
        <p>Účet <strong>${esc(session.email)}</strong> je v systému zapsaný,
           ale zatím nemáš zapnutý žádný modul.</p>
        <p>Napiš <a href="mailto:${esc(SUPERADMIN_EMAIL)}">${esc(SUPERADMIN_EMAIL)}</a>,
           ať ti přístupy zapne.</p>
        <p class="muted">Registrace: ${esc(formatDate(session.registeredAt)) || '—'}</p>
        <button id="gate-sign-out" class="btn">Odhlásit</button>
      </div>
    </div>`;

  mount.querySelector('#gate-sign-out').addEventListener('click', onSignOut);
}
