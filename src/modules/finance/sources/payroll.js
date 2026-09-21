// Zdroj: mzdy — jen paušály.
//
// Paušál je jediný mzdový náklad, který se dá říct dopředu: platí se za každý
// kalendářní měsíc bez ohledu na odpracované hodiny. Hodinová práce se předem
// spočítat nedá, protože ještě není vykázaná.
//
// **Proto je zdroj výchozí vypnutý a jmenuje se „Mzdy (jen paušály)".**
// Zapnutý a nepopsaný by tiše chybějící hodinoví lidé vypadali jako nula —
// a to je přesně ten druh čísla, které si systém zakazuje.
//
// Pravidlo je stejné jako ve Výplatách: rozhoduje sazba platná k poslednímu
// dni měsíce.

import { listUsers } from '../../access/store.js';
import { rateRecordResolver } from '../../rates/store.js';

/** Poslední den měsíce jako 'YYYY-MM-DD', lokálně. */
export function lastDayIso(month) {
  const d = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Součet paušálů platných k danému dni. Hodinoví lidé sem nepatří. */
export function fixedForMonth(emails, month, recordOn) {
  const day = lastDayIso(month);
  return emails.reduce((sum, email) => {
    const record = recordOn(email, day);
    return sum + (record?.type === 'monthly' ? (Number(record.monthly_amount) || 0) : 0);
  }, 0);
}

export const payrollSource = {
  id: 'payroll',
  label: 'Mzdy (jen paušály)',
  note: 'Hodinová práce v tomhle čísle není — dopředu se spočítat nedá.',
  sign: -1,
  enabledByDefault: false,

  async load(cache) {
    const users = await cache.once('users', listUsers);
    const emails = users.map((u) => u.email);
    const recordOn = await cache.once('rates', () => rateRecordResolver(emails));
    return { emails, recordOn };
  },

  amountFor(data, month) {
    return fixedForMonth(data.emails, month, data.recordOn);
  },

  itemsFor(data, month) {
    const day = lastDayIso(month);
    return data.emails
      .map((email) => {
        const record = data.recordOn(email, day);
        return record?.type === 'monthly'
          ? { label: email.split('@')[0], amount: Number(record.monthly_amount) || 0 }
          : null;
      })
      .filter((i) => i && i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  },
};
