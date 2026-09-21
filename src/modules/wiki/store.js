// ŠG wiki — datová vrstva. Stránka = titulek, text a od jaké role je čitelná.
//
// Backend: Supabase, tabulka wiki_pages. RLS tady dělá to, kvůli čemu wiki
// dostala úrovně: kdo má 'read', jen čte; psát smí jen 'edit'.
//
// `min_role` je druhá, nezávislá vrstva: stránku vidí jen ten, kdo má aspoň
// tu hodnost. Filtruje to databáze, ne tenhle soubor — kdo na stránku nemá,
// ji z dotazu vůbec nedostane. Proto se tu nikde nefiltruje podle role.

import { sb, unwrap } from '../../supabase.js';
import { ROLES } from '../access/roles.js';

export { ROLE_LABEL } from '../access/roles.js';

/** Od jaké role je stránka čitelná. Výchozí je nejnižší patro. */
export const VISIBILITY = ROLES;
export const DEFAULT_VISIBILITY = 'designer';

const TABLE = 'wiki_pages';

/** Všechny stránky, naposledy upravené nahoře. */
export async function getPages() {
  return unwrap(
    await sb.from(TABLE).select('*').order('updated_at', { ascending: false })
  );
}

/** Jedna stránka, nebo null. */
export async function getPage(id) {
  return unwrap(await sb.from(TABLE).select('*').eq('id', id).maybeSingle());
}

/** Založí stránku. Vrací nový záznam. */
export async function createPage(email, patch = {}) {
  return unwrap(await sb.from(TABLE).insert({
    title: patch.title ?? '',
    text: patch.text ?? '',
    min_role: VISIBILITY.includes(patch.min_role) ? patch.min_role : DEFAULT_VISIBILITY,
    updated_by: email || '',
  }).select().single());
}

/** Upraví stránku a orazítkuje ji. Vrací upravený záznam, nebo null. */
export async function updatePage(id, email, patch) {
  return unwrap(await sb.from(TABLE).update({
    ...patch,
    updated_at: new Date().toISOString(),
    updated_by: email || '',
  }).eq('id', id).select().single());
}

/**
 * Smaže stránku.
 *
 * `.select()` vrací smazané řádky. Prázdno znamená, že ji politika nepustila —
 * DELETE takový řádek jen přeskočí a chybu nevyhodí. Bez téhle kontroly by UI
 * oznámilo „smazáno" a stránka by tam pořád byla.
 */
export async function deletePage(id) {
  const smazane = unwrap(await sb.from(TABLE).delete().eq('id', id).select());
  if (!smazane.length) throw new Error('Stránku smazat nesmíš — to může jen superadmin.');
}
