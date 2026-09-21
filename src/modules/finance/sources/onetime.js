// Zdroj: jednorázové náklady.
//
// Spadnou do měsíce svého očekávaného data. Co je v minulosti, se ve výhledu
// neukáže — výhled se nekouká zpátky.

import { listCosts, amountForMonth } from '../../costs/store.js';

export const onetime = {
  id: 'onetime',
  label: 'Jednorázové náklady',
  sign: -1,
  enabledByDefault: true,

  async load(cache) {
    const all = await cache.once('costs', () => listCosts());
    return { rows: all.filter((c) => c.kind === 'onetime') };
  },

  amountFor(data, month) {
    return data.rows.reduce((sum, c) => sum + amountForMonth(c, month), 0);
  },

  itemsFor(data, month) {
    return data.rows
      .map((c) => ({ label: c.name, amount: amountForMonth(c, month), date: c.due_date }))
      .filter((i) => i.amount > 0)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  },
};
