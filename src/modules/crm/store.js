// CRM data layer — OPP (příležitosti).
//
// Stav OPP: 'open' → 'frozen' (odložená) → zpět, nebo konec: 'won' / 'lost'.
// Otevřené a zmrazené žijí na hlavní stránce, vyhrané a prohrané v archivu.
//
// Backend: Supabase, tabulka crm_opps. Příležitosti jsou společné — kdo má
// modul CRM, vidí je všechny; měnit je smí jen s úrovní 'edit'.

import { sb, unwrap } from '../../supabase.js';

const TABLE = 'crm_opps';

export const STATUSES = ['open', 'frozen', 'won', 'lost'];

/** Uzavřené stavy — patří do archivu, ne do pipeline. */
export const CLOSED = ['won', 'lost'];

export const STATUS_LABEL = {
  open: 'otevřená',
  frozen: 'zmrazená',
  won: 'vyhraná',
  lost: 'prohraná',
};

/** Dnešní datum jako 'YYYY-MM-DD' (lokální čas). */
export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** est_value chodí z Postgresu jako numeric (řetězec) — vrátíme ho jako číslo. */
function normalize(row) {
  const n = Number(row.est_value);
  return { ...row, est_value: row.est_value == null || Number.isNaN(n) ? null : n };
}

/** Všechny OPP, nejnovější (dle založení) nahoře. */
export async function getOpps() {
  const rows = unwrap(
    await sb.from(TABLE).select('*').order('created_at', { ascending: false })
  );
  return rows.map(normalize);
}

/** Založí novou OPP; created_at i updated_at = dnes. Vrací nový záznam. */
export async function createOpp(patch = {}) {
  const now = today();
  const row = unwrap(await sb.from(TABLE).insert({
    project: patch.project ?? '',
    contact: patch.contact ?? '',
    est_value: patch.est_value ?? null,
    notes: patch.notes ?? '',
    status: STATUSES.includes(patch.status) ? patch.status : 'open',
    created_at: now,
    updated_at: now,
  }).select().single());
  return normalize(row);
}

/** Upraví pole OPP a nastaví updated_at = dnes. Vrací upravený záznam. */
export async function updateOpp(id, patch) {
  const row = unwrap(await sb.from(TABLE).update({
    ...patch, updated_at: today(),
  }).eq('id', id).select().single());
  return normalize(row);
}

/** Přepne stav OPP. Neznámý stav ignorujeme. Vrací upravený záznam. */
export async function setStatus(id, status) {
  if (!STATUSES.includes(status)) return null;
  return updateOpp(id, { status });
}

/** Smaže OPP. */
export async function deleteOpp(id) {
  unwrap(await sb.from(TABLE).delete().eq('id', id));
}
