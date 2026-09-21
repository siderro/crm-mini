// To-Do — datová vrstva.
//
// Položka prochází třemi stavy:
//   'raw'    — rychle odložená myšlenka z levého sloupce
//   'ticket' — překlopený úkol, na kterém se pracuje
//   'done'   — hotovo, spadlo do archivu (nese `done_at` kvůli filtrům)
//
// Backend: Supabase, tabulka todo_items. Je to osobní seznam: v localStorage
// byl vlastník daný prohlížečem, tady ho nese sloupec `email`. Čtení nefiltrujeme
// ručně — RLS pouští každému jen jeho vlastní řádky.

import { sb, unwrap } from '../../supabase.js';

const TABLE = 'todo_items';

export const STAGES = ['raw', 'ticket', 'done'];

/** Položky daného stavu, nejnovější nahoře. Archiv řadíme podle dokončení. */
export async function getItems(stage) {
  const key = stage === 'done' ? 'done_at' : 'created_at';
  return unwrap(
    await sb.from(TABLE).select('*').eq('stage', stage).order(key, { ascending: false })
  );
}

/**
 * Víc poznámek najednou — jedním dotazem, ne v cyklu.
 *
 * Rychlý sběr je od toho, aby šlo vysypat hlavu naráz; deset řádků znamenalo
 * deset kol po síti za sebou a znatelnou prodlevu, než se pole vyprázdnilo.
 */
export async function addRawMany(email, texts) {
  const rows = (texts || [])
    .map((t) => (t || '').trim())
    .filter(Boolean)
    .map((text) => ({ email, text, stage: 'raw' }));

  if (!email || !rows.length) return [];
  return unwrap(await sb.from(TABLE).insert(rows).select());
}

/** Překlopí raw poznámku na tiket. */
export async function promote(id) {
  return unwrap(await sb.from(TABLE).update({
    stage: 'ticket', promoted_at: new Date().toISOString(),
  }).eq('id', id).select().single());
}

/** Upraví text položky. Prázdný text se ignoruje. */
export async function updateText(id, text) {
  const value = (text || '').trim();
  if (!value) return null;
  return unwrap(await sb.from(TABLE).update({ text: value }).eq('id', id).select().single());
}

/** Odškrtne hotovo (→ archiv), nebo vrátí zpět mezi tikety. */
export async function setDone(id, done) {
  return unwrap(await sb.from(TABLE).update(
    done
      ? { stage: 'done', done_at: new Date().toISOString() }
      : { stage: 'ticket', done_at: null }
  ).eq('id', id).select().single());
}

/** Smaže položku v jakémkoli stavu. */
export async function deleteItem(id) {
  unwrap(await sb.from(TABLE).delete().eq('id', id));
}
