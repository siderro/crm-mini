// Finance výhled — společná matematika měsíců a skládání zdrojů.
//
// Nezná databázi ani DOM. Zdroje (fakturace, SLA, náklady, mzdy) žijí
// v `sources/`; tenhle soubor umí jen dvě věci: spočítat, které měsíce se
// ukazují, a složit z nich součty.

export const RANGES = [
  { id: 'next12', label: 'Příštích 12 měsíců' },
  { id: 'year', label: 'Tento rok' },
  { id: 'nextyear', label: 'Příští rok' },
];

export const DEFAULT_RANGE = 'next12';

/**
 * Měsíce, které výhled ukazuje. Je to plán, takže se nikdy nekouká zpátky —
 * „tento rok" znamená zbytek roku, ne od ledna. Co mělo být vyfakturované
 * dřív a není, řeší zdroj sám svým blokem „po termínu".
 */
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

/** 'YYYY-MM-DD' → půlnoc lokálně. Null pro prázdné i nesmyslné datum. */
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

/**
 * Které zdroje jsou zapnuté, z toho, co bylo uloženo.
 *
 * Odděleně od localStorage, aby to šlo otestovat — a protože je tu jedna past:
 * **uložené prázdné pole není totéž co „nic uloženého".** Prázdné pole znamená,
 * že člověk schválně vypnul všechno; kdyby se i na něj sáhlo výchozími zdroji,
 * nešel by poslední zdroj vypnout, samo by se to zase zaplo.
 */
export function enabledFrom(saved, known, fallback) {
  if (!Array.isArray(saved)) return fallback;
  return saved.filter((id) => known.includes(id));
}

/**
 * Sdílená paměť na jedno načtení výhledu.
 *
 * Fakturace i SLA potřebují tentýž seznam projektů. Bez tohohle by se načetl
 * dvakrát — a s každým dalším zdrojem by to rostlo. Klíč je řetězec, hodnota
 * je slib; druhý ptající dostane ten samý.
 */
export function makeCache() {
  const box = new Map();
  return {
    once(key, load) {
      if (!box.has(key)) box.set(key, load());
      return box.get(key);
    },
  };
}

/**
 * Složí zapnuté zdroje do měsíců.
 *
 *   months   — pole Date (první den měsíce) z monthsFor()
 *   sources  — zapnuté zdroje; každý má { id, sign, amountFor, itemsFor }
 *   dataById — co který zdroj načetl, podle id
 *
 * Vrací pole měsíců s rozpadem po zdrojích a s čistým zůstatkem. Vypnutý zdroj
 * se sem nepředává vůbec — proto tu není žádné `if (enabled)`.
 *
 * Měsíc bez jediné položky vrací nuly, ne prázdno: díra ve výhledu je
 * informace a má být vidět.
 */
export function foldMonths(months, sources, dataById) {
  return months.map((date) => {
    const rows = sources.map((s) => {
      const data = dataById[s.id];
      return {
        source: s,
        amount: Number(s.amountFor(data, date)) || 0,
        items: s.itemsFor ? s.itemsFor(data, date) : [],
      };
    });

    const income = sum(rows.filter((r) => r.source.sign > 0));
    const expense = sum(rows.filter((r) => r.source.sign < 0));

    return { date, key: monthKey(date), rows, income, expense, net: income - expense };
  });
}

function sum(rows) {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

/** Součty za celý horizont. */
export function horizonTotals(folded) {
  return folded.reduce(
    (acc, m) => ({ income: acc.income + m.income, expense: acc.expense + m.expense, net: acc.net + m.net }),
    { income: 0, expense: 0, net: 0 }
  );
}

/** Kolik za celý horizont přinesl jeden zdroj — do popisku u checkboxu. */
export function sourceTotal(folded, sourceId) {
  return folded.reduce((acc, m) => {
    const row = m.rows.find((r) => r.source.id === sourceId);
    return acc + (row ? row.amount : 0);
  }, 0);
}
