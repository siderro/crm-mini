// Ziskovost projektů — období a formátování.

import { formatMoney } from '../../util.js';

export const RANGES = [
  { id: 'year', label: 'Tento rok' },
  { id: 'lastyear', label: 'Loňský rok' },
  { id: 'all', label: 'Vše' },
];

export const DEFAULT_RANGE = 'year';

/** Hranice [od, do) jako 'YYYY-MM-DD'; null = neomezeno. */
export function rangeBounds(id) {
  const year = new Date().getFullYear();
  if (id === 'year') return [`${year}-01-01`, null];
  if (id === 'lastyear') return [`${year - 1}-01-01`, `${year}-01-01`];
  return [null, null];
}

export function inRange(value, [from, to]) {
  const day = String(value || '').slice(0, 10);
  return (from === null || day >= from) && (to === null || day < to);
}

export function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

export const czk = (v) => formatMoney(Math.round(v || 0));
