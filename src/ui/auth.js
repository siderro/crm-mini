import { signInWithGoogle } from '../supabase.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="login-page">
      <h1>BREVIS</h1>
      <p>Sign in to manage your contacts</p>
      <button id="google-login" class="btn btn-primary">Sign in with Google</button>
    </div>`;

  container.querySelector('#google-login').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      alert('Login failed: ' + e.message);
    }
  });
}
