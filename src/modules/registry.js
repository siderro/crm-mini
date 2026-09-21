// Registr modulů, které super admin zapíná lidem. Pořadí = pořadí v navigaci.
// Každý modul: { id, label, desc, render(mount, subPath[]) }.
//
// Modul „Lidé" tu schválně není — nezapíná se nikomu, vidí ho jen super admin.
// Díky tomu se odsud neimportuje `people`, a nevzniká kruhový import.

import { timesheet } from './timesheet/index.js';
import { todo } from './todo/index.js';
import { pm } from './projects/index.js';
import { crm } from './crm/index.js';
import { projectAccess } from './projects/access.js';
import { payroll } from './payroll/index.js';
import { finance } from './finance/index.js';
import { costs } from './costs/index.js';
import { profit } from './profit/index.js';
import { staff } from './staff/index.js';
import { perf } from './perf/index.js';
import { wiki } from './wiki/index.js';
import { devdata } from './devdata/index.js';

// Pořadí = pořadí v navigaci i na hubu. Nejdřív to, co se dělá denně, pak
// řízení, pak peníze. Uvnitř peněz to, co se zadává (náklady, výplaty), pak
// co z toho plyne (výhled), a nakonec vyhodnocení.
export const MODULES = [
  timesheet, todo, pm, crm, projectAccess,
  costs, payroll, finance, profit, staff, perf,
  wiki, devdata,
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));
