// Kdo je přihlášený a kam smí. Jedno místo, kde se na tuhle otázku odpovídá —
// router se pak už jen ptá.

import { ALLOWED_DOMAIN, SUPERADMIN_EMAIL } from './config.js';
import { MODULES, MODULE_BY_ID } from './modules/registry.js';
import { touchUser, getUserAccess } from './modules/access/store.js';

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
    return { email, isSuperadmin: false, moduleAccess: {}, allowedModules: [], registeredAt: null, state: 'denied' };
  }

  const record = await touchUser(email);
  const isSuperadmin = email === SUPERADMIN_EMAIL.trim().toLowerCase();

  // Super admin má všechno vždycky — jeho práva se nečtou z dat.
  const moduleAccess = isSuperadmin
    ? Object.fromEntries(MODULES.map((m) => [m.id, 'edit']))
    : await getUserAccess(email);


  const allowedModules = Object.keys(moduleAccess);

  return {
    email,
    isSuperadmin,
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
