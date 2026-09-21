// Náklady — datová vrstva.
//
// Jedna tabulka `costs`, dva tvary rozlišené sloupcem `kind` (stejný vzor jako
// `rates`). Výhled si díky tomu načte náklady jedním dotazem.
//
// Backend: Supabase. RLS: peněžní tabulka, čte a píše jen superadmin.

import { sb, unwrap } from '../../supabase.js';
import { normalize } from './model.js';

export {
  KINDS, KIND_LABEL, PERIODS, PERIOD_LABEL,
  num, parseDay, today, activeIn, amountForMonth, sameMonth,
  monthlyEquivalent, thisMonth, normalize,
} from './model.js';

const TABLE = 'costs';

/** Položky daného druhu, nebo všechny. Pravidelné podle názvu, jednorázové podle data. */
export async function listCosts(kind = null) {
  let q = sb.from(TABLE).select('*');
  if (kind) q = q.eq('kind', kind);
  return unwrap(await q.order('due_date', { ascending: true, nullsFirst: false }).order('name'));
}

/** Založí položku. Vrací nový záznam, nebo null když formulář nedává smysl. */
export async function addCost(patch) {
  const row = normalize(patch);
  if (!row) return null;
  return unwrap(await sb.from(TABLE).insert(row).select().single());
}

/** Přepíše položku. Vrací upravený záznam, nebo null když formulář nedává smysl. */
export async function updateCost(id, patch) {
  const row = normalize(patch);
  if (!row) return null;
  return unwrap(await sb.from(TABLE).update(row).eq('id', id).select().single());
}

export async function deleteCost(id) {
  const smazane = unwrap(await sb.from(TABLE).delete().eq('id', id).select());
  if (!smazane.length) throw new Error('Položku smazat nesmíš.');
}
