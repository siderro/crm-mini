// Zdroj: fakturace projektů.
//
// Odhad je jednoduchý: projekt se vyfakturuje po svém odhadovaném konci,
// s odstupem na vystavení faktury. Částka je cena projektu i s project
// managementem — to je to, co jde klientovi na faktuře. SLA v tom není,
// ta je vlastní zdroj.
//
// Uzavřené projekty se nezobrazují — ty už jsou za námi.

import { getProjects, isBillable } from '../../projects/store.js';
import { parseDay, addDays, monthKey } from '../logic.js';

/** Kolik dní po konci projektu se počítá s vystavením faktury. */
export const INVOICE_LAG_DAYS = 20;

/** Kolik se za projekt vyfakturuje. Pro bono a interní nic. */
export function invoiceAmount(p) {
  if (!isBillable(p)) return 0;
  return (Number(p.est_price) || 0) + (Number(p.est_pm) || 0);
}

/**
 * Roztřídí projekty na to, co se dá naplánovat, a na to, co se naplánovat nedá.
 * Čistá funkce — `today` se předává, ať to jde otestovat.
 */
export function bucketProjects(projects, today) {
  const planned = [];    // má se fakturovat, datum je v budoucnu
  const overdue = [];    // datum už uteklo a projekt pořád běží
  const undated = [];    // bez odhadu konce se plánovat nedá
  const unbilled = [];   // pro bono a interní

  for (const p of projects) {
    if (!isBillable(p)) { unbilled.push(p); continue; }

    const end = parseDay(p.est_end);
    if (!end) { undated.push(p); continue; }

    const item = { project: p, date: addDays(end, INVOICE_LAG_DAYS), amount: invoiceAmount(p) };
    (item.date < today ? overdue : planned).push(item);
  }

  return { planned, overdue, undated, unbilled };
}

export const invoices = {
  id: 'invoices',
  label: 'Fakturace projektů',
  sign: +1,
  enabledByDefault: true,

  async load(cache) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const projects = await cache.once('projects', getProjects);   // jen běžící; uzavřené jsou za námi
    return { ...bucketProjects(projects, today), projects };
  },

  amountFor(data, month) {
    return data.planned
      .filter((i) => monthKey(i.date) === monthKey(month))
      .reduce((sum, i) => sum + i.amount, 0);
  },

  itemsFor(data, month) {
    return data.planned
      .filter((i) => monthKey(i.date) === monthKey(month))
      .sort((a, b) => a.date - b.date)
      .map((i) => ({ label: i.project.name, amount: i.amount, date: i.date, projectId: i.project.id }));
  },
};
