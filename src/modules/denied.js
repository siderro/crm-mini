// Cizí doména — účet, který do aplikace vůbec nepatří. Session je v tu chvíli
// už odhlášená, tohle je jen vysvětlení, proč to skončilo.

import { esc } from '../util.js';
import { ALLOWED_DOMAIN } from '../config.js';

export function renderDenied(mount, email) {
  mount.innerHTML = `
    <div class="login">
      <div class="login-card gate-card">
        <div class="login-logo">Brevis</div>
        <h1>Sem nemáš přístup</h1>
        <p>Účet <strong>${esc(email)}</strong> není z domény
           <strong>${esc(ALLOWED_DOMAIN)}</strong>.</p>
        <p class="muted">Aplikace je jen pro účty téhle domény. Byl jsi odhlášen.</p>
        <button id="gate-retry" class="btn">Zkusit jiný účet</button>
      </div>
    </div>`;

  mount.querySelector('#gate-retry').addEventListener('click', () => location.reload());
}
