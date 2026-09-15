// Příjmy výhled — výpočet.
//
// Fakturace = odhadovaný konec projektu + odstup na vystavení faktury.
// SLA je zvlášť: účtuje se za každý kalendářní měsíc, ve kterém projekt běží.

import { isBillable } from '../projects/model.js';

/** Kolik dní po konci projektu se počítá s vystavením faktury. */
export const INVOICE_LAG_DAYS = 20;

export const RANGES = [
  { id: 'next12', label: 'Příštích 12 měsíců' },
  { id: 'year', label: 'Tento rok' },
  { id: 'nextyear', label: 'Příští rok' },
];

export const DEFAULT_RANGE = 'next12';

export const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

export function monthsFor(rangeId, today) {
  const y = today.getFullYear();
  const m = today.getMonth();

  const build = (year, from, count) =>
    Array.from({ length: count }, (_, i) => new Date(year, from + i, 1));

  switch (rangeId) {
    case 'year': return build(y, m, 12 - m);
    case 'nextyear': return build(y + 1, 0, 12);
    default: return build(y, m, 12);
  }
}

export function rangeTotalLabel(rangeId) {
  return RANGES.find((r) => r.id === rangeId)?.label || '';
}

export function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function runsInMonth(project, month) {
  const start = parseDay(project.est_start);
  const end = parseDay(project.est_end);
  if (!start || !end) return false;   // bez termínů se plánovat nedá

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return start <= monthEnd && end >= monthStart;
}

export function slaForMonth(projects, month) {
  const active = projects.filter((p) => isBillable(p) && p.est_sla && runsInMonth(p, month));
  return {
    count: active.length,
    amount: active.reduce((sum, p) => sum + (Number(p.est_sla) || 0), 0),
  };
}

export function invoiceAmount(p) {
  if (!isBillable(p)) return 0;
  return (Number(p.est_price) || 0) + (Number(p.est_pm) || 0);
}
