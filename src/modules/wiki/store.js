// ŠG wiki — datová vrstva. Stránka = titulek + text, nic víc.
//
// Backend: Supabase, tabulka wiki_pages. RLS tady dělá to, kvůli čemu wiki
// dostala úrovně: kdo má 'read', jen čte; psát smí jen 'edit'.

import { sb, unwrap } from '../../supabase.js';

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

/** Smaže stránku. */
export async function deletePage(id) {
  unwrap(await sb.from(TABLE).delete().eq('id', id));
}
