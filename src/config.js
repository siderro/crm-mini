// Supabase configuration.
// The anon/publishable key is safe to commit — access is gated by RLS policies.
export const SUPABASE_URL = 'https://juquttlvkairdgdkzpke.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_tKbsPXd1ZbT5E0Am7oAA6w_GMjeM1Is';

// ── Přístup do aplikace ──
// Dovnitř se dostane jen účet z téhle domény.
export const ALLOWED_DOMAIN = 'svejda-goldmann.cz';

// Super admin. Role plyne odsud, ne z dat — nejde ji odkliknout ani přepsat
// v localStorage / v databázi.
export const SUPERADMIN_EMAIL = 'jakub@svejda-goldmann.cz';
