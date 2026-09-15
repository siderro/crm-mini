// Ekonomika projektu — odvozené výpočty na jednom místě.
//
// Schválně mimo store.js: store je datová vrstva, která se překlopí na Supabase.
// Tohle jsou výpočty nad daty ze tří zdrojů (projekt, výkazy, sazby) a nikam
// se neukládají — kromě snapshotu při uzavření projektu.
//
// Pravidla, ze kterých to vychází:
//   · Sazba je NÁKLAD. Náklad práce = hodiny × sazba platná k datu výkazu.
//   · Design se měří v hodinách (proti est_hours), PM v penězích (proti est_pm).
//   · SLA stojí mimo ziskovost — je to průtok za služby třetích stran.
//   · Dokud projekt běží, počítá se spotřeba ceny, ne zisk. Marže až po uzavření.

import { getEntries } from '../timesheet/store.js';
import { rateResolver } from '../rates/store.js';
import { isBillable, marginOf, compute } from './model.js';







/**
 * Spočítá ekonomiku projektu. U uzavřeného projektu vrací zmrazený snapshot,
 * takže pozdější změna sazby zpětně nepřepíše historii.
 *
 * → {
 *   design: { hours, estHours, cost, estPrice, remainingMoney, overHours },
 *   pm:     { hours, cost, budget, remainingMoney, over },
 *   sla:    { monthly, months, total },
 *   total:  { hours, cost, missingRate },
 *   margin: { revenue, cost, profit, percent } | null,
 *   closed: bool,
 * }
 */
export async function projectStats(project) {
  if (project.status === 'closed' && project.final) {
    return { ...project.final, closed: true };
  }

  const entries = await getEntries({ projectId: project.id });
  // Sazby načteme jednou pro všechny lidi na projektu; jinak by z každého
  // výkazu byl samostatný síťový dotaz.
  const rateOn = await rateResolver(entries.map((e) => e.email));
  return compute(project, entries, rateOn);
}

/**
 * Totéž pro celý seznam projektů — dva dotazy dohromady místo dvou na projekt.
 * Výpisy (běžící i uzavřené) mají používat tohle.
 */
export async function statsForProjects(projects) {
  const live = projects.filter((p) => !(p.status === 'closed' && p.final));

  if (!live.length) {
    return new Map(projects.map((p) => [p.id, { ...p.final, closed: true }]));
  }

  const entries = await getEntries();
  const rateOn = await rateResolver(entries.map((e) => e.email));

  const byProject = new Map();
  for (const e of entries) {
    if (!byProject.has(e.project_id)) byProject.set(e.project_id, []);
    byProject.get(e.project_id).push(e);
  }

  return new Map(projects.map((p) => [
    p.id,
    p.status === 'closed' && p.final
      ? { ...p.final, closed: true }
      : compute(p, byProject.get(p.id) || [], rateOn),
  ]));
}

/** Vlastní výpočet nad už načtenými daty. */


/**
 * Snapshot pro uzavření: spočítá se se zadanou fakturovanou cenou a uloží se
 * do projektu, aby se od té chvíle už nepřepočítával.
 */
export async function snapshotFor(project, finalPrice) {
  const stats = await projectStats({ ...project, status: 'active', final: null });
  const revenue = finalPrice != null && finalPrice !== ''
    ? Number(finalPrice)
    : (Number(project.est_price) || 0);

  return { ...stats, closed: true, margin: marginOf(project, revenue, stats.total.cost) };
}
