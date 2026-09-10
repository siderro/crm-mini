import { signInWithGoogle } from './supabase.js';

export function renderLogin(mount) {
  mount.innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="login-logo">Brevis</div>
        <p class="muted">Přihlas se pro přístup ke svým datům.</p>
        <button id="google-login" class="btn btn-primary">Přihlásit přes Google</button>
        <div id="login-error" class="form-error"></div>
      </div>
    </div>`;

  mount.querySelector('#google-login').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      mount.querySelector('#login-error').textContent = 'Přihlášení selhalo: ' + e.message;
    }
  });
}
