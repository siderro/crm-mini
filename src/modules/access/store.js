// Registr lidí, kteří se do systému přihlásili, a jejich práv k modulům.
//
// Přístup k modulu má úroveň: 'read' (jen čtení) nebo 'edit' (může měnit).
// Uloženo jako mapa { moduleId: level } ve sloupci `modules` (jsonb);
// modul, který v mapě není, je zamčený.
//
// Backend: Supabase, tabulka app_users. RLS hlídá, že si nikdo nemůže přepsat
// vlastní práva — při přihlášení si smí posunout jen last_login. Rozdávat
// práva smí jen superadmin. Kontroly v prohlížeči jsou proti tomu jen kosmetika.

import { sb, unwrap } from '../../supabase.js';

const TABLE = 'app_users';

export const LEVELS = ['read', 'edit'];

/** Zahodí úrovně, kterým nerozumíme — ať se do session nedostane nesmysl. */
function normalizeModules(modules) {
  if (!modules || typeof modules !== 'object' || Array.isArray(modules)) return {};
  return Object.fromEntries(
    Object.entries(modules).filter(([, level]) => LEVELS.includes(level))
  );
}

function normalize(row) {
  return { ...row, modules: normalizeModules(row.modules) };
}

/**
 * Zapíše člověka při přihlášení (nebo jen posune `last_login`).
 * Nový člověk nezačíná s ničím — `modules` je prázdná mapa.
 * Vrací jeho záznam.
 */
export async function touchUser(email) {
  const now = new Date().toISOString();

  const existing = unwrap(
    await sb.from(TABLE).select('*').eq('email', email).maybeSingle()
  );

  if (existing) {
    const updated = unwrap(
      await sb.from(TABLE).update({ last_login: now }).eq('email', email).select().single()
    );
    return normalize(updated);
  }

  const created = unwrap(
    await sb.from(TABLE)
      .insert({ email, first_login: now, last_login: now, modules: {} })
      .select().single()
  );
  return normalize(created);
}

/** Všichni, kdo se aspoň jednou přihlásili. Nejdřív registrovaní nahoře. */
export async function listUsers() {
  const rows = unwrap(
    await sb.from(TABLE).select('*').order('first_login', { ascending: true })
  );
  return rows.map(normalize);
}

/** Mapa { moduleId: level } pro daného člověka. Neznámý člověk → prázdno. */
export async function getUserAccess(email) {
  const row = unwrap(
    await sb.from(TABLE).select('modules').eq('email', email).maybeSingle()
  );
  return row ? normalizeModules(row.modules) : {};
}

/**
 * Nastaví úroveň přístupu k jednomu modulu.
 * `level` = 'read' | 'edit', nebo null/'' pro odebrání. Vrací upravený záznam.
 *
 * Čte se a zapisuje celá mapa — jsonb se nedá měnit po klíči jedním dotazem
 * a přepínání práv je vzácná operace, kde na jeden dotaz navíc nezáleží.
 */
export async function setUserModule(email, moduleId, level) {
  const current = await getUserAccess(email);

  if (LEVELS.includes(level)) current[moduleId] = level;
  else delete current[moduleId];

  const updated = unwrap(
    await sb.from(TABLE).update({ modules: current }).eq('email', email).select().single()
  );
  return normalize(updated);
}
