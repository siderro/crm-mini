// Registr lidí, kteří se do systému přihlásili, a jejich práv k modulům.
//
// Přístup k modulu má úroveň: 'read' (jen čtení) nebo 'edit' (může měnit).
// Uloženo jako mapa { moduleId: level } ve sloupci `modules` (jsonb);
// modul, který v mapě není, je zamčený.
//
// Vedle mapy modulů má člověk `role` ('designer' | 'manager' | 'admin').
// Role dělá dvě věci: je to **předloha** mapy modulů (viz roles.js) a zároveň
// **hodnost**, podle které RLS rozhoduje, které řádky uvnitř modulu uvidí.
// Předloha se materializuje, hodnost platí živě.
//
// Backend: Supabase, tabulka app_users. RLS hlídá, že si nikdo nemůže přepsat
// vlastní práva ani vlastní roli — při přihlášení si smí posunout jen
// last_login. Rozdávat práva smí jen superadmin. Kontroly v prohlížeči jsou
// proti tomu jen kosmetika.

import { sb, unwrap } from '../../supabase.js';
import { ROLES, ROLE_MODULES } from './roles.js';

// Pojmy rolí a předlohy žijí v roles.js; tady se jen přeposílají, aby volající
// nemusel vědět, odkud co je.
export { ROLES, ROLE_LABEL, ROLE_DESC, ROLE_MODULES, rankOf, matchesRole } from './roles.js';

const TABLE = 'app_users';

export const LEVELS = ['read', 'edit'];

/** Zahodí úrovně, kterým nerozumíme — ať se do session nedostane nesmysl. */
function normalizeModules(modules) {
  if (!modules || typeof modules !== 'object' || Array.isArray(modules)) return {};
  return Object.fromEntries(
    Object.entries(modules).filter(([, level]) => LEVELS.includes(level))
  );
}

/** Role, které nerozumíme, zahodíme — do session nepatří nesmysl. */
function normalizeRole(role) {
  return ROLES.includes(role) ? role : null;
}

function normalize(row) {
  return { ...row, modules: normalizeModules(row.modules), role: normalizeRole(row.role) };
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

/**
 * Práva a role jednoho člověka — { modules, role }. Neznámý člověk → prázdno.
 * Jedním dotazem: session potřebuje obojí a dvě kola po síti při přihlášení
 * jsou vidět.
 */
export async function getUserAccess(email) {
  const row = unwrap(
    await sb.from(TABLE).select('modules, role').eq('email', email).maybeSingle()
  );
  return {
    modules: row ? normalizeModules(row.modules) : {},
    role: row ? normalizeRole(row.role) : null,
  };
}

/**
 * Nastaví roli a **zapíše její předlohu do mapy modulů**. To je ta
 * materializace: od téhle chvíle je „co tenhle člověk vidí" odpověditelné
 * pohledem na jeden řádek, a jednotlivé moduly jdou pak ještě doladit.
 *
 * `role` = null roli i moduly sebere. Vrací upravený záznam.
 */
export async function setUserRole(email, role) {
  const next = ROLES.includes(role) ? role : null;
  const modules = next ? { ...ROLE_MODULES[next] } : {};

  const updated = unwrap(
    await sb.from(TABLE).update({ role: next, modules }).eq('email', email).select().single()
  );
  return normalize(updated);
}

/**
 * Nastaví úroveň přístupu k jednomu modulu.
 * `level` = 'read' | 'edit', nebo null/'' pro odebrání. Vrací upravený záznam.
 *
 * Čte se a zapisuje celá mapa — jsonb se nedá měnit po klíči jedním dotazem
 * a přepínání práv je vzácná operace, kde na jeden dotaz navíc nezáleží.
 */
export async function setUserModule(email, moduleId, level) {
  const { modules: current } = await getUserAccess(email);

  if (LEVELS.includes(level)) current[moduleId] = level;
  else delete current[moduleId];

  const updated = unwrap(
    await sb.from(TABLE).update({ modules: current }).eq('email', email).select().single()
  );
  return normalize(updated);
}
