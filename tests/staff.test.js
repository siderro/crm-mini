import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soldRates, blank, add, finish, priceEntry, rangeBounds, inRange } from '../src/modules/staff/logic.js';

// Pravidlo modulu: každá hodina má prodejní cenu (cena projektu ÷ odhad hodin,
// u PM rozpočet ÷ skutečné PM hodiny) a náklad (sazba). Když se na projektu
// přeteče, prodejní hodnota hodiny klesne a přínos spadne.

const ALFA = { id: 'alfa', billing: 'client', est_price: 400000, est_hours: 100, est_pm: 60000 };
const VNITRO = { id: 'vnitro', billing: 'internal', est_price: null, est_hours: null };
const BEZ_ODHADU = { id: 'bez', billing: 'client', est_price: null, est_hours: null };

test('prodejní hodina = cena ÷ odhad hodin', () => {
  const r = soldRates(ALFA, 20);
  assert.equal(r.design, 4000);
  assert.equal(r.pm, 3000, 'PM rozpočet se dělí skutečnými PM hodinami');
  assert.equal(r.unknown, false);
});

test('uzavřený projekt prodává za skutečně fakturovanou cenu', () => {
  assert.equal(soldRates({ ...ALFA, final_price: 300000 }, 0).design, 3000);
});

test('přetečený projekt prodává hodinu levněji', () => {
  // stejná cena, ale dvojnásobný odhad hodin → poloviční hodnota hodiny
  assert.equal(soldRates({ ...ALFA, est_hours: 200 }, 0).design, 2000);
});

test('PM hodnota klesá, čím víc se na PM dělá', () => {
  assert.equal(soldRates(ALFA, 10).pm, 6000);
  assert.equal(soldRates(ALFA, 60).pm, 1000);
  assert.equal(soldRates(ALFA, 0).pm, null, 'bez odpracovaných PM hodin se nedá dělit');
});

test('interní projekt neprodává nic', () => {
  const r = soldRates(VNITRO, 0);
  assert.equal(r.design, 0);
  assert.equal(r.pm, 0);
});

test('projekt bez odhadu se nedá ocenit', () => {
  const r = soldRates(BEZ_ODHADU, 0);
  assert.equal(r.design, null);
  assert.equal(r.unknown, true);
});

/** Poskládá jeden aggregát tak, jak to dělá modul. */
function aggregate(entries, projects, pmHours, rateOn) {
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const rates = Object.fromEntries(projects.map((p) => [p.id, soldRates(p, pmHours[p.id] || 0)]));
  const acc = blank();
  for (const e of entries) {
    const { rate, sold, billable } = priceEntry(e, byId, rates, rateOn);
    add(acc, e, rate, sold, billable);
  }
  return finish(acc);
}

test('přínos = prodáno − náklad', () => {
  const r = aggregate(
    [{ email: 'jan@x.cz', project_id: 'alfa', kind: 'design', hours: 60, date: '2026-09-01' }],
    [ALFA], { alfa: 20 }, () => 800,
  );

  assert.equal(r.sold, 240000);      // 60 h × 4000
  assert.equal(r.cost, 48000);       // 60 h × 800
  assert.equal(r.profit, 192000);
  assert.equal(Math.round(r.margin), 80);
});

test('drahý člověk má nižší marži při stejné práci', () => {
  const levny = aggregate([{ email: 'a', project_id: 'alfa', kind: 'design', hours: 40, date: '2026-09-01' }], [ALFA], {}, () => 800);
  const drahy = aggregate([{ email: 'b', project_id: 'alfa', kind: 'design', hours: 40, date: '2026-09-01' }], [ALFA], {}, () => 1500);
  assert.ok(levny.margin > drahy.margin);
  assert.equal(Math.round(drahy.margin), 63);
});

test('interní hodiny nekazí marži klientské práce, ale náklad se eviduje', () => {
  const r = aggregate([
    { email: 'jan@x.cz', project_id: 'alfa', kind: 'design', hours: 40, date: '2026-09-01' },
    { email: 'jan@x.cz', project_id: 'vnitro', kind: 'design', hours: 10, date: '2026-09-02' },
  ], [ALFA, VNITRO], {}, () => 800);

  assert.equal(r.internalHours, 10);
  assert.equal(r.internalCost, 8000);
  assert.equal(r.cost, 40000, 'celkový náklad musí obsahovat i interní práci');
  // marže se počítá jen z klientské části: 160 000 prodáno − 32 000 náklad
  assert.equal(r.profit, 128000, 'interní náklad se promítl do marže');
});

test('hodiny na projektu bez odhadu se nezapočítají, ale spočítají se zvlášť', () => {
  const r = aggregate([
    { email: 'jan@x.cz', project_id: 'bez', kind: 'design', hours: 5, date: '2026-09-01' },
  ], [BEZ_ODHADU], {}, () => 800);

  assert.equal(r.sold, 0);
  assert.equal(r.unknownHours, 5, 'neoceněné hodiny tiše zmizely');
  assert.equal(r.hours, 5);
});

test('období', () => {
  const y = new Date().getFullYear();
  assert.deepEqual(rangeBounds('year'), [`${y}-01-01`, `${y}-12-31`]);
  assert.deepEqual(rangeBounds('lastyear'), [`${y - 1}-01-01`, `${y - 1}-12-31`]);
  assert.deepEqual(rangeBounds('all'), [null, null]);

  assert.equal(inRange('2026-06-15', ['2026-01-01', '2026-12-31']), true);
  assert.equal(inRange('2025-12-31', ['2026-01-01', '2026-12-31']), false);
  assert.equal(inRange('2026-12-31', ['2026-01-01', '2026-12-31']), true, 'horní hranice musí být včetně');
  assert.equal(inRange('2020-01-01', [null, null]), true);
});
