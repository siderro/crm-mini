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
import { isBillable } from './store.js';

/** 'YYYY-MM-DD' nebo ISO → půlnoc lokálně; null pro nesmysl. */
function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Kolik kalendářních měsíců projekt zabírá — kvůli SLA, které se účtuje
 * každý započatý měsíc. Bez termínů nevíme, vrací null.
 */
function monthSpan(project) {
  const start = parseDay(project.est_start);
  const end = parseDay(project.closed_at || project.est_end);
  if (!start || !end || end < start) return null;
  return (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1;
}

/** Součet hodin a nákladu jedné skupiny výkazů. `rateOn` páruje sazby v paměti. */
function sumCost(entries, rateOn) {
  let hours = 0;
  let cost = 0;
  let missingRate = false;

  for (const e of entries) {
    hours += e.hours;
    const rate = rateOn(e.email, e.date);
    if (rate == null) missingRate = true;
    else cost += rate * e.hours;
  }
  return { hours, cost, missingRate };
}

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
function compute(project, entries, rateOn) {
  const design = sumCost(entries.filter((e) => e.kind !== 'pm'), rateOn);
  const pm = sumCost(entries.filter((e) => e.kind === 'pm'), rateOn);

  const estHours = Number(project.est_hours) || 0;
  const estPrice = Number(project.est_price) || 0;
  const pmBudget = Number(project.est_pm) || 0;
  const slaMonthly = Number(project.est_sla) || 0;
  const months = monthSpan(project);

  const totalCost = design.cost + pm.cost;
  const closed = project.status === 'closed';

  // Výnos je skutečně fakturovaná cena, když ji známe; jinak odhad.
  // SLA se do marže nepočítá — viz hlavička.
  const revenue = project.final_price != null ? Number(project.final_price) : estPrice;

  return {
    design: {
      hours: design.hours,
      estHours: estHours || null,
      cost: design.cost,
      estPrice: estPrice || null,
      remainingMoney: estPrice ? estPrice - design.cost : null,
      overHours: estHours && design.hours > estHours ? design.hours - estHours : 0,
    },
    pm: {
      hours: pm.hours,
      cost: pm.cost,
      budget: pmBudget || null,
      remainingMoney: pmBudget ? pmBudget - pm.cost : null,
      over: pmBudget ? Math.max(0, pm.cost - pmBudget) : 0,
    },
    sla: {
      monthly: slaMonthly || null,
      months,
      total: slaMonthly && months ? slaMonthly * months : null,
    },
    total: {
      hours: design.hours + pm.hours,
      cost: totalCost,
      missingRate: design.missingRate || pm.missingRate,
    },
    // Zisk dává smysl jen u uzavřeného klientského projektu.
    margin: closed && isBillable(project)
      ? {
          revenue,
          cost: totalCost,
          profit: revenue - totalCost,
          percent: revenue ? ((revenue - totalCost) / revenue) * 100 : null,
        }
      : null,
    closed,
  };
}

/**
 * Snapshot pro uzavření: spočítá se se zadanou fakturovanou cenou a uloží se
 * do projektu, aby se od té chvíle už nepřepočítával.
 */
export async function snapshotFor(project, finalPrice) {
  const stats = await projectStats({ ...project, status: 'active', final: null });
  const revenue = finalPrice != null && finalPrice !== ''
    ? Number(finalPrice)
    : (Number(project.est_price) || 0);

  return {
    ...stats,
    closed: true,
    margin: isBillable(project)
      ? {
          revenue,
          cost: stats.total.cost,
          profit: revenue - stats.total.cost,
          percent: revenue ? ((revenue - stats.total.cost) / revenue) * 100 : null,
        }
      : null,
  };
}
