// Projekty — pojmy a čisté funkce.
//
// Odděleně od store.js schválně: store mluví se Supabase, tohle ne. Díky tomu
// si výpočty (logic.js, economics.js) i testy můžou vzít pojmy, aniž by táhly
// databázového klienta.

export const LEVELS = ['view', 'report'];

export const LEVEL_LABEL = { view: 'vidí', report: 'vykazuje' };

export const ROLES = ['designer', 'manager'];

export const ROLE_LABEL = { designer: 'Designer', manager: 'Manager' };

export const BILLING = ['client', 'probono', 'internal'];

export const BILLING_LABEL = { client: 'Klientský', probono: 'Pro bono', internal: 'Interní' };

/** Vydělává projekt? Pro bono a interní nemají výnos, marže se u nich nepočítá. */
export function isBillable(project) {
  return (project?.billing || 'client') === 'client';
}

export const MONEY_FIELDS = ['est_price', 'est_pm', 'est_sla'];

export function num(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


// ── Ekonomika ──
//
// Čistý výpočet nad už načtenými daty. Kdo je zavolá, musí si výkazy a sazby
// obstarat sám — díky tomu to jde otestovat bez sítě.

/**
 * Marže uzavřeného klientského projektu. Null tam, kde nedává smysl:
 * u běžícího projektu zbývá práce, která zisk sníží, a pro bono s interními
 * nemají výnos.
 */
export function marginOf(project, revenue, cost) {
  if (!isBillable(project)) return null;
  return {
    revenue,
    cost,
    profit: revenue - cost,
    percent: revenue ? ((revenue - cost) / revenue) * 100 : null,
  };
}

/** 'YYYY-MM-DD' nebo ISO → půlnoc lokálně; null pro nesmysl. */
export function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Kolik kalendářních měsíců projekt zabírá — kvůli SLA, které se účtuje
 * každý započatý měsíc. Bez termínů nevíme, vrací null.
 */
export function monthSpan(project) {
  const start = parseDay(project.est_start);
  const end = parseDay(project.closed_at || project.est_end);
  if (!start || !end || end < start) return null;
  return (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1;
}

/** Součet hodin a nákladu jedné skupiny výkazů. `rateOn` páruje sazby v paměti. */
export function sumCost(entries, rateOn) {
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

export function compute(project, entries, rateOn) {
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
    // Zisk dává smysl jen u uzavřeného projektu — u běžícího zbývá práce.
    margin: closed ? marginOf(project, revenue, totalCost) : null,
    closed,
  };
}
