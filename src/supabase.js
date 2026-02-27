import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Load Supabase client from CDN (already loaded in index.html)
const { createClient } = supabase;

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth helpers ──

export async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export function onAuthChange(callback) {
  return sb.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
