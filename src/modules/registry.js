// Registr modulů, které super admin zapíná lidem. Pořadí = pořadí v navigaci.
// Každý modul: { id, label, desc, render(mount, subPath[]) }.
//
// Modul „Lidé" tu schválně není — nezapíná se nikomu, vidí ho jen super admin.
// Díky tomu se odsud neimportuje `people`, a nevzniká kruhový import.

import { crm } from './crm/index.js';
import { todo } from './todo/index.js';
import { pm } from './projects/index.js';
import { timesheet } from './timesheet/index.js';
import { projectAccess } from './projects/access.js';
import { payroll } from './payroll/index.js';
import { income } from './income/index.js';
import { wiki } from './wiki/index.js';
import { notes } from './notes.js';

export const MODULES = [crm, todo, pm, timesheet, projectAccess, payroll, income, wiki, notes];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));
