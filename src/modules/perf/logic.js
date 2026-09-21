// Výkon — výpočet.
//
// Kapacitu známe jen u paušálů; hodinoví lidé žádnou slíbenou nemají, takže
// se počítají do odvedené práce, ale ne do toho, co „máme".

export const RANGES = [
  { id: 'last12', label: 'Posledních 12 měsíců' },
  { id: 'year', label: 'Tento rok' },
  { id: 'lastyear', label: 'Loňský rok' },
];

export const DEFAULT_RANGE = 'last12';

export { MONTH_NAMES } from '../../util.js';

export function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

export function pct(part, whole) {
  return whole ? Math.round((part / whole) * 100) : null;
}

/** Jméno do úzké karty — e-mail bez domény. */
export function shortName(email) {
  return String(email).split('@')[0];
}

export function monthsFor(rangeId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (rangeId === 'year') return Array.from({ length: m + 1 }, (_, i) => new Date(y, i, 1));
  if (rangeId === 'lastyear') return Array.from({ length: 12 }, (_, i) => new Date(y - 1, i, 1));
  return Array.from({ length: 12 }, (_, i) => new Date(y, m - 11 + i, 1));
}

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function lastDayIso(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = new Date(y, m + 1, 0).getDate();
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
