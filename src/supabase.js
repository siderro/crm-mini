import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Klient se načítá z CDN v index.html (UMD, globální `supabase`).
//
// Vytváří se až při prvním použití, ne při načtení modulu. Dva důvody:
//   · když CDN vypadne, dostaneš srozumitelnou hlášku místo bílé stránky
//     (dřív to spadlo dřív, než se vůbec stihla spustit aplikace)
//   · moduly jdou naimportovat i mimo prohlížeč, což potřebují testy

let client = null;

function real() {
  if (client) return client;

  const lib = globalThis.supabase;
  if (!lib?.createClient) {
    throw new Error('Nepodařilo se načíst knihovnu Supabase. Zkontroluj připojení a obnov stránku.');
  }
  client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export const sb = new Proxy({}, {
  get(_, prop) {
    const value = real()[prop];
    return typeof value === 'function' ? value.bind(real()) : value;
  },
});

/**
 * Supabase vrací chybu v odpovědi, ne výjimkou. Storey ale mají chybu vyhodit,
 * aby ji UI mohlo ukázat místo toho, aby tiše zobrazilo prázdno.
 *
 *   const rows = unwrap(await sb.from('t').select('*'));
 */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ── Auth ──

export async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
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
  return sb.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}
