// Projekty a přístupy k nim.
//
// Dvě věci, které patří k sobě:
//   1. projekty — název, odhady (termíny, hodiny, ceny), stav
//   2. kdo do kterého smí — { project_id, email, level, role }
//
// level 'view'   = projekt vidí
// level 'report' = vidí a může do něj vykazovat (vykazovat bez vidění nedává smysl)
// role  'designer' | 'manager' — jedna role na projekt a člověka
//
// Odhad ceny NENÍ jeden součet — jsou to tři oddělené koše s různou jednotkou:
//   est_price — dodaná práce, měří se proti est_hours (je v ní zisk)
//   est_pm    — project management, měří se v penězích, do est_hours nepatří
//   est_sla   — fixní částka za KALENDÁŘNÍ MĚSÍC, opakovaný příjem mimo cenu projektu
//
// Projekt je 'active' nebo 'closed'. Uzavření zmrazí čísla do `final`, aby
// pozdější změna sazby zpětně nepřepsala historii (stejný princip jako rateAt).
//
// Backend: Supabase, tabulky projects a project_members. RLS pouští k projektu
// jen toho, kdo má modul Projekty, nebo kdo je na něm přiřazený; měnit ho smí
// jen editor modulu.

import { sb, unwrap } from '../../supabase.js';
import { LEVELS, ROLES, BILLING, num } from './model.js';

// Pojmy žijí v model.js (jde je použít bez databáze); tady se jen přeposílají,
// aby si je moduly mohly brát ze store jako dřív.
export {
  LEVELS, LEVEL_LABEL, ROLES, ROLE_LABEL, BILLING, BILLING_LABEL,
  isBillable, MONEY_FIELDS,
} from './model.js';

const PROJECTS = 'projects';
const MEMBERS = 'project_members';

/** Číselná pole projektu — jinde se na ně jen odkazujeme, ať se nerozejdou. */

/** Prázdné pole je null, ne 0 — „nevyplněno" a „nula" nejsou totéž. */

// ── Projekty ──

/** Projekty podle jména; uzavřené jen když si o ně řekneš. */
export async function getProjects({ includeClosed = false, onlyClosed = false } = {}) {
  let query = sb.from(PROJECTS).select('*').order('name');
  if (onlyClosed) query = query.eq('status', 'closed');
  else if (!includeClosed) query = query.eq('status', 'active');
  return unwrap(await query);
}

/** Jeden projekt, nebo null. */
export async function getProject(id) {
  return unwrap(await sb.from(PROJECTS).select('*').eq('id', id).maybeSingle());
}

/** Založí projekt. Bez názvu to nejde. */
export async function addProject(patch = {}) {
  const name = (patch.name || '').trim();
  if (!name) return null;

  return unwrap(await sb.from(PROJECTS).insert({
    name,
    billing: BILLING.includes(patch.billing) ? patch.billing : 'client',
    est_start: patch.est_start || null,
    est_end: patch.est_end || null,
    est_hours: num(patch.est_hours),
    est_price: num(patch.est_price),
    est_pm: num(patch.est_pm),
    est_sla: num(patch.est_sla),
  }).select().single());
}

/** Upraví projekt. Prázdný název se ignoruje, čísla se normalizují. */
export async function updateProject(id, patch = {}) {
  const changes = { ...patch };

  if ('name' in changes) {
    const name = (changes.name || '').trim();
    if (!name) return null;
    changes.name = name;
  }
  for (const f of ['est_hours', ...MONEY_FIELDS]) {
    if (f in changes) changes[f] = num(changes[f]);
  }
  for (const f of ['est_start', 'est_end']) {
    if (f in changes) changes[f] = changes[f] || null;
  }
  if ('billing' in changes && !BILLING.includes(changes.billing)) delete changes.billing;

  return unwrap(await sb.from(PROJECTS).update(changes).eq('id', id).select().single());
}

/**
 * Uzavře projekt. `finalPrice` je skutečně fakturovaná cena (může se lišit od
 * odhadu), `stats` je snapshot spočítané ekonomiky. Od téhle chvíle se čísla
 * projektu už nepřepočítávají a nedá se do něj vykazovat.
 */
export async function closeProject(id, { finalPrice = null, stats = null } = {}) {
  return unwrap(await sb.from(PROJECTS).update({
    status: 'closed',
    closed_at: new Date().toISOString(),
    final_price: num(finalPrice),
    final: stats,
  }).eq('id', id).select().single());
}

/**
 * Zmrazí čísla u projektu, který už uzavřený je — bez sahání na `closed_at`.
 * Používá to generátor testovacích dat: uzavřené dummy projekty jsou uzavřené
 * k datu v minulosti a přepsat jim ho na dnešek by z nich udělalo nesmysl.
 */
export async function saveSnapshot(id, stats) {
  return unwrap(await sb.from(PROJECTS).update({ final: stats }).eq('id', id).select().single());
}

/** Vrátí projekt mezi běžící a zahodí zmrazená čísla. */
export async function reopenProject(id) {
  return unwrap(await sb.from(PROJECTS).update({
    status: 'active', closed_at: null, final: null, final_price: null,
  }).eq('id', id).select().single());
}

/**
 * Smaže projekt; přiřazení lidí zmizí s ním (cizí klíč to kaskáduje).
 * Projekt s výkazy databáze smazat nedovolí — odpracovaný čas nemá kam mizet.
 * V takovém případě to vyhodí chybu, kterou UI ukáže.
 */
export async function deleteProject(id) {
  // `.select()` vrací smazané řádky. Když je prázdno, politika řádek nepustila
  // — DELETE v Postgresu takový řádek jen přeskočí, nevyhodí chybu. Bez téhle
  // kontroly by UI oznámilo „smazáno" a projekt by tam pořád byl.
  const smazane = unwrap(await sb.from(PROJECTS).delete().eq('id', id).select());
  if (!smazane.length) throw new Error('Projekt smazat nesmíš — to může jen superadmin.');
}

// ── Přiřazení lidí ──

/** Mapa { email: { projectId: level } } — pro matici v Nastavení. */
export async function getMembers() {
  const rows = unwrap(await sb.from(MEMBERS).select('project_id, email, level'));
  const map = {};
  for (const m of rows) (map[m.email] ||= {})[m.project_id] = m.level;
  return map;
}

/** Kolik lidí je na kterém projektu — { projectId: počet }. Pro výpisy. */
export async function memberCountByProject() {
  const rows = unwrap(await sb.from(MEMBERS).select('project_id'));
  const counts = {};
  for (const r of rows) counts[r.project_id] = (counts[r.project_id] || 0) + 1;
  return counts;
}

/** Lidé na jednom projektu, i s rolí. */
export async function getProjectMembers(projectId) {
  const rows = unwrap(
    await sb.from(MEMBERS).select('email, level, role').eq('project_id', projectId).order('email')
  );
  return rows.map((m) => ({ ...m, role: ROLES.includes(m.role) ? m.role : null }));
}

/**
 * Nastaví přiřazení člověka k projektu. `level` null = odebrat.
 * `role` vynechaná (undefined) nechá stávající roli být — matice v Nastavení
 * přepíná jen úroveň a nesmí přitom shodit roli nastavenou v projektu.
 */
export async function setMember(projectId, email, level, role) {
  if (!LEVELS.includes(level)) {
    unwrap(await sb.from(MEMBERS).delete().eq('project_id', projectId).eq('email', email));
    return null;
  }

  let nextRole = role;
  if (nextRole === undefined) {
    const existing = unwrap(
      await sb.from(MEMBERS).select('role').eq('project_id', projectId).eq('email', email).maybeSingle()
    );
    nextRole = existing?.role ?? null;
  }

  return unwrap(await sb.from(MEMBERS).upsert({
    project_id: projectId,
    email,
    level,
    role: ROLES.includes(nextRole) ? nextRole : null,
  }).select().single());
}

/**
 * Projekty, do kterých daný člověk smí, i s úrovní a rolí.
 * Tohle si vezme timesheet: nabídne jen projekty s úrovní 'report'.
 */
export async function projectsFor(email, { level = null } = {}) {
  let query = sb.from(MEMBERS).select('project_id, level, role').eq('email', email);
  if (level !== null) query = query.eq('level', level);
  const mine = unwrap(await query);
  if (!mine.length) return [];

  const projects = unwrap(
    await sb.from(PROJECTS).select('*')
      .eq('status', 'active')
      .in('id', mine.map((m) => m.project_id))
      .order('name')
  );

  return projects.map((p) => {
    const m = mine.find((x) => x.project_id === p.id);
    return { ...p, level: m.level, role: m.role || null };
  });
}

/** Smí tenhle člověk vykazovat do tohohle projektu? */
export async function canReport(email, projectId) {
  const row = unwrap(
    await sb.from(MEMBERS).select('level')
      .eq('email', email).eq('project_id', projectId).maybeSingle()
  );
  return row?.level === 'report';
}
