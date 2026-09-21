// Zdroje výhledu. Pořadí = pořadí checkboxů a pořadí v kartě měsíce:
// nejdřív co přijde, pak co odejde.
//
// Přidat šestý zdroj = jeden soubor a jeden řádek tady. `index.js` o financích
// neví nic, umí jen sčítat znaménka.
//
// Kontrakt zdroje:
//   { id, label, note?, sign: +1 | -1, enabledByDefault,
//     async load(cache) → data,
//     amountFor(data, month) → number,
//     itemsFor?(data, month) → [{ label, amount, date?, projectId? }] }

import { invoices } from './invoices.js';
import { sla } from './sla.js';
import { recurring } from './recurring.js';
import { onetime } from './onetime.js';
import { payrollSource } from './payroll.js';

export const SOURCES = [invoices, sla, recurring, onetime, payrollSource];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

export const DEFAULT_SOURCE_IDS = SOURCES.filter((s) => s.enabledByDefault).map((s) => s.id);
