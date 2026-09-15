// Výplaty — výpočet.
//
// Odděleně od UI, aby šel otestovat bez prohlížeče. Pravidla:
//   · paušál se platí za každý měsíc období, bez ohledu na odpracované hodiny
//   · hodinová práce se platí podle výkazů, sazbou k datu výkazu
//   · kdo v období přešel z jednoho na druhé, dostane obojí

import { hourlyOf } from '../rates/model.js';

export const RANGES = [
  { id: 'month', label: 'Tento měsíc' },
  { id: 'lastmonth', label: 'Minulý měsíc' },
  { id: 'nextmonth', label: 'Příští měsíc' },
  { id: 'year', label: 'Tento rok' },
  { id: 'lastyear', label: 'Loňský rok' },
];

export const DEFAULT_RANGE = 'month';

export const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

export function iso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function lastDayOf(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function monthsOf(rangeId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const one = (year, month) => [{ year, month }];

  switch (rangeId) {
    case 'lastmonth': return one(...(m === 0 ? [y - 1, 11] : [y, m - 1]));
    case 'nextmonth': return one(...(m === 11 ? [y + 1, 0] : [y, m + 1]));
    case 'year': return Array.from({ length: m + 1 }, (_, i) => ({ year: y, month: i }));
    case 'lastyear': return Array.from({ length: 12 }, (_, i) => ({ year: y - 1, month: i }));
    default: return one(y, m);
  }
}

export function rangeLabel(months) {
  const first = months[0];
  const last = months[months.length - 1];
  if (months.length === 1) return `${MONTH_NAMES[first.month]} ${first.year}`;
  return `${MONTH_NAMES[first.month]} – ${MONTH_NAMES[last.month]} ${last.year}`;
}

export function boundsOf(months) {
  const first = months[0];
  const last = months[months.length - 1];
  return [
    iso(first.year, first.month, 1),
    iso(last.year, last.month, lastDayOf(last.year, last.month)),
  ];
}

export function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

export function payFor(email, months, entries, recordOn) {
  let fixed = 0;
  let hourly = 0;
  let hours = 0;
  const types = new Set();

  for (const { year, month } of months) {
    const monthEnd = iso(year, month, lastDayOf(year, month));
    const record = recordOn(email, monthEnd);
    if (record?.type === 'monthly') {
      fixed += Number(record.monthly_amount) || 0;
      types.add('monthly');
    }
  }

  for (const e of entries) {
    hours += e.hours;
    const record = recordOn(e.email, e.date);
    if (!record) continue;
    if (record.type === 'hourly') {
      hourly += (hourlyOf(record) || 0) * e.hours;
      types.add('hourly');
    }
  }

  return { fixed, hourly, hours, total: fixed + hourly, types: [...types] };
}
