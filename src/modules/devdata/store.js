// Testovací data — datová vrstva.
//
// Všechno dělají funkce v databázi. Z prohlížeče to nejde: RLS správně
// zakazuje zapsat výkaz za někoho jiného a generátor musí vykázat práci
// pěti vymyšleným lidem. Funkce jsou `security definer`, ale samy si ověří,
// že je volá superadmin — viz supabase/migrations/002_dummy_data.sql.

import { sb, unwrap } from '../../supabase.js';

/** Kolik testovacích dat je v systému. → { lide, projekty, vykazy, … } */
export async function stats() {
  return unwrap(await sb.rpc('dummy_data_stats'));
}

/**
 * Vygeneruje kompletní testovací sadu. Nejdřív smaže tu stávající, takže
 * opakované spuštění nenadělá duplikáty. Vrací počty toho, co vzniklo.
 */
export async function generate() {
  return unwrap(await sb.rpc('generate_dummy_data'));
}

/** Smaže testovací data. Opravdových lidí a jejich dat se to nedotkne. */
export async function wipe() {
  return unwrap(await sb.rpc('delete_dummy_data'));
}
