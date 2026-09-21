// Kdo je přihlášený a kam smí. Jedno místo, kde se na tuhle otázku odpovídá —
// router se pak už jen ptá.
//
// Dvě nezávislé věci:
//   · moduleAccess — které obrazovky vidí (mapa { moduleId: 'read' | 'edit' })
//   · role/rank    — které řádky uvnitř nich uvidí; tuhle otázku ale nakonec
//                    zodpovídá RLS v databázi, ne tohle. Hodnost je tu proto,
//                    aby šlo schovat, co by stejně přišlo prázdné.

import { ALLOWED_DOMAIN, SUPERADMIN_EMAILS } from './config.js';
import { MODULES, MODULE_BY_ID } from './modules/registry.js';
import { touchUser, getUserAccess, rankOf } from './modules/access/store.js';

const SUPERADMINS = SUPERADMIN_EMAILS.map((e) => e.trim().toLowerCase());

/**
 * Ze Supabase uživatele udělá rozhodnutí:
 *   state 'denied'  — mimo povolenou doménu, dovnitř vůbec nesmí
 *   state 'waiting' — je registrovaný, ale nemá zapnutý žádný modul
 *   state 'ok'      — má aspoň jeden modul
 *
 * `moduleAccess` je mapa { moduleId: 'read' | 'edit' }.
 */
export async function buildSession(user) {
  const email = (user?.email || '').trim().toLowerCase();

  if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
    return {
      email, isSuperadmin: false, role: null, rank: 0,
      moduleAccess: {}, allowedModules: [], registeredAt: null, state: 'denied',
    };
  }

  const record = await touchUser(email);
  const isSuperadmin = SUPERADMINS.includes(email);

  // Super admin má všechno vždycky — jeho práva se nečtou z dat.
  const access = isSuperadmin
    ? { modules: Object.fromEntries(MODULES.map((m) => [m.id, 'edit'])), role: null }
    : await getUserAccess(email);

  const moduleAccess = access.modules;
  const allowedModules = Object.keys(moduleAccess);

  return {
    email,
    isSuperadmin,
    role: isSuperadmin ? 'superadmin' : access.role,
    rank: isSuperadmin ? rankOf('superadmin') : rankOf(access.role),
    moduleAccess,
    allowedModules,
    registeredAt: record?.first_login || null,
    // Super admin nikdy nečeká — má vlastní modul Přístupy, i kdyby ostatní byly prázdné.
    state: isSuperadmin || allowedModules.length ? 'ok' : 'waiting',
  };
}

/** Modul, který se nikomu nezapíná — vidí ho jen superadmin. */
function isRestricted(moduleId) {
  return moduleId === 'people' || !!MODULE_BY_ID[moduleId]?.superadminOnly;
}

/** Smí tenhle člověk na tenhle modul? */
export function canAccess(session, moduleId) {
  if (!session) return false;
  if (isRestricted(moduleId)) return session.isSuperadmin;
  return session.allowedModules.includes(moduleId);
}

/** Smí v tom modulu i měnit data? Modul bez úrovní má u lidí vždy 'edit'. */
export function canEdit(session, moduleId) {
  if (!session) return false;
  if (isRestricted(moduleId)) return session.isSuperadmin;
  return session.moduleAccess[moduleId] === 'edit';
}
