// Supabase configuration.
// The anon/publishable key is safe to commit — access is gated by RLS policies.
export const SUPABASE_URL = 'https://juquttlvkairdgdkzpke.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_tKbsPXd1ZbT5E0Am7oAA6w_GMjeM1Is';

// ── Přístup do aplikace ──
// Dovnitř se dostane jen účet z téhle domény.
export const ALLOWED_DOMAIN = 'svejda-goldmann.cz';

// Super admin. Plyne odsud, ne z dat — nejde ho odkliknout ani přepsat
// v localStorage / v databázi. Proto je to jediné právo, které nejde získat
// zápisem do tabulky.
//
// Je to seznam schválně: jeden účet by znamenal, že jeho ztrátou nikdo nikdy
// nikomu nepřidělí práva. Musí sedět s is_superadmin() v migraci 004_roles.sql —
// tady se schovávají tlačítka, tam se to hlídá doopravdy.
export const SUPERADMIN_EMAILS = ['jakub@svejda-goldmann.cz'];
