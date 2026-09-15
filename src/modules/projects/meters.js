// Měrky projektu — stav v lidské řeči, ne holá čísla.
//
// Čistý výpočet bez DOM: přehled si z toho udělá buňku, test si to ověří.
// Každá měrka vrací stejný tvar:
//   { tone, text, percent }   percent === null znamená „proužek nekreslit"
//
// tone: 'muted' (nevíme) | 'idle' (ještě nezačal) | 'ok' | 'warn' | 'over'

import { formatDate, formatMoney } from '../../util.js';

/** Hodiny bez zbytečných desetinných míst. */
export function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

/** „za X" — 1 den, 3 dny, 5 dní. */
export function days(n) {
  if (n === 1) return '1 den';
  if (n >= 2 && n <= 4) return `${n} dny`;
  return `${n} dní`;
}

/** „před X" — 1 dnem, 7 dny. Sedmý pád má v množném čísle jeden tvar. */
export function daysAgo(n) {
  return n === 1 ? '1 dnem' : `${n} dny`;
}

/** „zbývá X" — sloveso se musí shodnout s číslem. */
export function daysLeft(n) {
  if (n === 1) return 'zbývá 1 den';
  if (n >= 2 && n <= 4) return `zbývají ${n} dny`;
  return `zbývá ${n} dní`;
}

/** 'YYYY-MM-DD' → půlnoc lokálně. Null pro prázdné i nesmyslné datum. */
export function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Celé dny mezi dvěma půlnocemi. */
export function dayDiff(from, to) {
  return Math.round((to - from) / 86400000);
}

export function clamp(pct) {
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Kde je projekt v čase.
 * tone: 'muted' (nevíme) | 'idle' (ještě nezačal) | 'ok' | 'warn' (do konce
 * pár dní) | 'over' (mělo už skončit).
 */
export function timeMeter(p) {
  const start = parseDay(p.est_start);
  const end = parseDay(p.est_end);
  const now = startOfToday();

  if (!start && !end) return { tone: 'muted', text: 'bez termínu', percent: null };

  if (start && now < start) {
    return { tone: 'idle', text: `začíná za ${days(dayDiff(now, start))}`, percent: 0 };
  }

  if (end && now > end) {
    return { tone: 'over', text: `mělo skončit před ${daysAgo(dayDiff(end, now))}`, percent: 100 };
  }

  if (!end) {
    return { tone: 'ok', text: `běží od ${formatDate(p.est_start)}`, percent: null };
  }

  const left = dayDiff(now, end);
  const total = start ? dayDiff(start, end) : 0;
  return {
    tone: left <= 3 ? 'warn' : 'ok',
    text: left === 0 ? 'končí dnes' : daysLeft(left),
    percent: start ? (total > 0 ? clamp((dayDiff(start, now) / total) * 100) : 100) : null,
  };
}

/** Designové hodiny proti odhadu. PM hodiny sem nepatří. */
export function designMeter(stats) {
  const { hours, estHours, overHours } = stats.design;

  if (!estHours) {
    return hours
      ? { tone: 'ok', text: `${fmtHours(hours)} h natrackováno`, percent: null }
      : { tone: 'muted', text: 'bez odhadu', percent: null };
  }

  const base = `${fmtHours(hours)} / ${fmtHours(estHours)} h`;

  if (overHours) {
    return { tone: 'over', text: `${base} · přeteklo o ${fmtHours(overHours)} h`, percent: 100 };
  }
  const pct = (hours / estHours) * 100;
  return { tone: pct >= 90 ? 'warn' : 'ok', text: base, percent: clamp(pct) };
}

const money = (v) => formatMoney(Math.round(v || 0));

/** PM se měří v penězích — je tak i zadaný. */
export function pmMeter(stats) {
  const { cost, budget, over } = stats.pm;

  if (!budget) {
    return cost
      ? { tone: 'ok', text: `${money(cost)} odpracováno`, percent: null }
      : { tone: 'muted', text: 'bez PM', percent: null };
  }

  const base = `${money(cost)} / ${formatMoney(budget)}`;

  if (over) {
    return { tone: 'over', text: `${base} · přeteklo o ${money(over)}`, percent: 100 };
  }
  const pct = (cost / budget) * 100;
  return { tone: pct >= 90 ? 'warn' : 'ok', text: base, percent: clamp(pct) };
}

