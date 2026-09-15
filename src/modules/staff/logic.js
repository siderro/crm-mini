// Ziskovost lidí — výpočet.
//
// Každá vykázaná hodina má prodejní cenu a náklad:
//   design — cena projektu ÷ odhad hodin
//   PM     — částka na PM ÷ PM hodiny, které na projektu opravdu jsou
//   náklad — hodiny × sazba k datu výkazu
//
// Když se na projektu přeteče, prodejní hodnota hodiny klesne a přínos spadne.
// To je ta páka, kterou má modul ukázat.

import { formatMoney } from '../../util.js';
import { isBillable } from '../projects/model.js';

export const RANGES = [
  { id: 'month', label: 'Tento měsíc' },
  { id: 'lastmonth', label: 'Minulý měsíc' },
  { id: 'year', label: 'Tento rok' },
  { id: 'lastyear', label: 'Loňský rok' },
  { id: 'all', label: 'Vše' },
];

export const DEFAULT_RANGE = 'year';

export const VIEWS = [
  { id: 'people', label: 'Podle lidí' },
  { id: 'time', label: 'V čase' },
];

export const DEFAULT_VIEW = 'people';

export const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

export const czk = (v) => formatMoney(Math.round(v || 0));

export function fmtHours(n) {
  return Number(Number(n).toFixed(1)).toLocaleString('cs-CZ');
}

export function iso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Hranice [od, do] jako 'YYYY-MM-DD', obě včetně; null = neomezeno. */
export function rangeBounds(id) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = (yy, mm) => new Date(yy, mm + 1, 0).getDate();

  switch (id) {
    case 'month': return [iso(y, m, 1), iso(y, m, lastDay(y, m))];
    case 'lastmonth': {
      const [py, pm] = m === 0 ? [y - 1, 11] : [y, m - 1];
      return [iso(py, pm, 1), iso(py, pm, lastDay(py, pm))];
    }
    case 'year': return [iso(y, 0, 1), iso(y, 11, 31)];
    case 'lastyear': return [iso(y - 1, 0, 1), iso(y - 1, 11, 31)];
    default: return [null, null];
  }
}

export function inRange(date, [from, to]) {
  return (from === null || date >= from) && (to === null || date <= to);
}

export function soldRates(project, pmHours) {
  if (!isBillable(project)) return { design: 0, pm: 0, unknown: false };

  const price = project.final_price != null ? Number(project.final_price) : Number(project.est_price);
  const estHours = Number(project.est_hours);
  const pmBudget = Number(project.est_pm);

  return {
    design: price && estHours ? price / estHours : null,
    // PM se dělí skutečně odpracovanými hodinami — rozpočet je fixní, takže
    // čím víc se na něm dělá, tím míň každá hodina vydělá.
    pm: pmBudget && pmHours ? pmBudget / pmHours : null,
    unknown: !(price && estHours),
  };
}

export function blank() {
  return { hours: 0, cost: 0, sold: 0, unknownHours: 0, internalHours: 0, internalCost: 0 };
}

export function add(acc, e, rate, sold, billable) {
  acc.hours += e.hours;
  acc.cost += rate == null ? 0 : rate * e.hours;

  if (!billable) {
    acc.internalHours += e.hours;
    acc.internalCost += rate == null ? 0 : rate * e.hours;
    return;
  }
  if (sold == null) acc.unknownHours += e.hours;
  else acc.sold += sold * e.hours;
}

export function finish(acc) {
  const billableCost = acc.cost - acc.internalCost;
  return {
    ...acc,
    profit: acc.sold - billableCost,
    margin: acc.sold ? ((acc.sold - billableCost) / acc.sold) * 100 : null,
  };
}

export function priceEntry(e, byId, rates, rateOn) {
  const project = byId[e.project_id];
  const r = rates[e.project_id] || { design: null, pm: null };
  return {
    rate: rateOn(e.email, e.date),
    sold: e.kind === 'pm' ? r.pm : r.design,
    billable: project ? isBillable(project) : true,
    project,
  };
}
