// Zdroj: SLA.
//
// Účtuje se za každý kalendářní měsíc, ve kterém projekt běží — padá tedy do
// měsíců průběžně, ne na konec jako faktura za projekt. Proto je to vlastní
// zdroj a ne položka ve fakturaci.

import { getProjects, isBillable } from '../../projects/store.js';
import { parseDay } from '../logic.js';

/** Běží projekt v tomhle kalendářním měsíci? Rozhoduje překryv s termíny. */
export function runsInMonth(project, month) {
  const start = parseDay(project.est_start);
  const end = parseDay(project.est_end);
  if (!start || !end) return false;   // bez termínů se plánovat nedá

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return start <= monthEnd && end >= monthStart;
}

export function slaForMonth(projects, month) {
  const active = projects.filter((p) => isBillable(p) && p.est_sla && runsInMonth(p, month));
  return {
    count: active.length,
    amount: active.reduce((sum, p) => sum + (Number(p.est_sla) || 0), 0),
  };
}

export const sla = {
  id: 'sla',
  label: 'SLA',
  sign: +1,
  enabledByDefault: true,

  async load(cache) {
    return { projects: await cache.once('projects', getProjects) };
  },

  amountFor(data, month) {
    return slaForMonth(data.projects, month).amount;
  },

  itemsFor(data, month) {
    const { count, amount } = slaForMonth(data.projects, month);
    return count ? [{ label: `${count}× SLA`, amount }] : [];
  },
};
