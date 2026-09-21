// Náklady — pojmy a čisté funkce.
//
// Nezná databázi ani DOM, aby šlo otestovat to podstatné: jestli položka
// v daném měsíci opravdu odejde, a kolik.
//
// Dva tvary jedné tabulky:
//   'recurring' + 'monthly' — každý měsíc, dokud platí
//   'recurring' + 'yearly'  — jednou za rok, v měsíci `due_month`
//   'onetime'               — jednou, v měsíci data `due_date`

export const KINDS = ['recurring', 'onetime'];
export const KIND_LABEL = { recurring: 'Pravidelné', onetime: 'Jednorázové' };

export const PERIODS = ['monthly', 'yearly'];
export const PERIOD_LABEL = { monthly: 'Měsíčně', yearly: 'Ročně' };

/** Prázdné pole je null, ne 0 — nula je platná částka, nevyplněno není. */
export function num(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 'YYYY-MM-DD' → půlnoc lokálně. Null pro prázdné i nesmyslné datum. */
export function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Dnešek jako 'YYYY-MM-DD', lokálně. */
export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Platí pravidelná položka v tomhle kalendářním měsíci?
 * Rozhoduje překryv platnosti s měsícem, ne jen začátek — položka, která
 * začala uprostřed měsíce, ten měsíc už platí.
 */
export function activeIn(cost, month) {
  const from = parseDay(cost.valid_from);
  const to = parseDay(cost.valid_to);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  if (from && from > monthEnd) return false;
  if (to && to < monthStart) return false;
  return true;
}

/**
 * Kolik tahle položka odčerpá v daném měsíci. Nula znamená „tenhle měsíc nic",
 * ne „nevíme" — položka bez částky se do tabulky vůbec nedostane (check v DB).
 */
export function amountForMonth(cost, month) {
  const amount = Number(cost.amount) || 0;

  if (cost.kind === 'onetime') {
    const due = parseDay(cost.due_date);
    if (!due) return 0;
    return sameMonth(due, month) ? amount : 0;
  }

  if (!activeIn(cost, month)) return 0;
  if (cost.period === 'monthly') return amount;
  return month.getMonth() + 1 === Number(cost.due_month) ? amount : 0;
}

export function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Kolik nás pravidelné náklady stojí měsíčně „v průměru" — roční položka se
 * dvanáctinou. Je to jen pro dlaždici a souhrn; do konkrétního měsíce spadne
 * roční položka celá, ne po dvanáctinách.
 *
 * `month` je povinný a počítají se **jen položky, které v něm platí**.
 * Bez toho by vypovězené předplatné zvyšovalo průměr napořád — dlaždice by
 * říkala jiné číslo než výhled, a jedno z nich by lhalo.
 */
export function monthlyEquivalent(costs, month) {
  return costs
    .filter((c) => c.kind === 'recurring' && activeIn(c, month))
    .reduce((sum, c) => {
      const amount = Number(c.amount) || 0;
      return sum + (c.period === 'yearly' ? amount / 12 : amount);
    }, 0);
}

/** První den měsíce, ve kterém jsme. Pro dlaždici a souhrn. */
export function thisMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Formulář posílá řetězce a prázdná pole. Tohle z nich udělá řádek, který
 * projde check constraintem — tvar hlídá i databáze, ale ozvat se má dřív.
 * Vrací null, když chybí to, bez čeho položka nedává smysl.
 */
export function normalize(patch) {
  const kind = KINDS.includes(patch.kind) ? patch.kind : null;
  const name = (patch.name || '').trim();
  const amount = num(patch.amount);

  if (!kind || !name || amount == null || amount < 0) return null;

  const base = { kind, name, amount, note: (patch.note || '').trim() || null };

  if (kind === 'onetime') {
    if (!patch.due_date) return null;
    return { ...base, due_date: patch.due_date, period: null, due_month: null, valid_from: null, valid_to: null };
  }

  const period = PERIODS.includes(patch.period) ? patch.period : 'monthly';
  const dueMonth = period === 'yearly' ? num(patch.due_month) : null;
  if (period === 'yearly' && !(dueMonth >= 1 && dueMonth <= 12)) return null;

  const validFrom = patch.valid_from || today();
  const validTo = patch.valid_to || null;
  if (validTo && validTo < validFrom) return null;

  return {
    ...base,
    period,
    due_month: dueMonth,
    valid_from: validFrom,
    valid_to: validTo,
    due_date: null,
  };
}
