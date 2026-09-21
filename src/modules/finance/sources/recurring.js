// Zdroj: pravidelné náklady.
//
// Měsíční položka odejde každý měsíc, dokud platí. Roční odejde celá ve svém
// měsíci — ne po dvanáctinách. Rozpuštění na dvanáctiny by zakrylo, že
// v březnu opravdu odejde celá částka najednou.

import { listCosts, amountForMonth } from '../../costs/store.js';

export const recurring = {
  id: 'recurring',
  label: 'Pravidelné náklady',
  sign: -1,
  enabledByDefault: true,

  async load(cache) {
    const all = await cache.once('costs', () => listCosts());
    return { rows: all.filter((c) => c.kind === 'recurring') };
  },

  amountFor(data, month) {
    return data.rows.reduce((sum, c) => sum + amountForMonth(c, month), 0);
  },

  itemsFor(data, month) {
    return data.rows
      .map((c) => ({ label: c.name, amount: amountForMonth(c, month) }))
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  },
};
