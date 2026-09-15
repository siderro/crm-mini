import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthsOf, boundsOf, payFor, rangeLabel } from '../src/modules/payroll/logic.js';
import { hourlyOf } from '../src/modules/rates/model.js';

// Pravidla: paušál se platí za každý měsíc období bez ohledu na hodiny,
// hodinová práce podle výkazů. Kdo v období přešel z jednoho na druhé,
// dostane obojí.

const measice = (y, ...ms) => ms.map((m) => ({ year: y, month: m }));

// Eva: paušál 80k do konce srpna, od září 88k. Jan: hodinovka 800.
// Petr: paušál 60k do července, od srpna hodinovka 1000.
const RATES = [
  { email: 'eva@x.cz', type: 'monthly', monthly_amount: 88000, monthly_hours: 160, valid_from: '2026-09-01' },
  { email: 'eva@x.cz', type: 'monthly', monthly_amount: 80000, monthly_hours: 160, valid_from: '2026-01-01' },
  { email: 'jan@x.cz', type: 'hourly', rate: 800, valid_from: '2026-01-01' },
  { email: 'petr@x.cz', type: 'hourly', rate: 1000, valid_from: '2026-08-01' },
  { email: 'petr@x.cz', type: 'monthly', monthly_amount: 60000, monthly_hours: 150, valid_from: '2026-01-01' },
];

const recordOn = (email, date) =>
  RATES.find((r) => r.email === email && r.valid_from <= date) || null;

test('paušál se platí za měsíc, ne za hodiny', () => {
  const r = payFor('eva@x.cz', measice(2026, 8), [
    { email: 'eva@x.cz', date: '2026-09-03', hours: 200 },
  ], recordOn);

  assert.equal(r.fixed, 88000, 'nevzala se sazba platná na konci měsíce');
  assert.equal(r.hourly, 0);
  assert.equal(r.total, 88000, 'přeplatilo se za odpracované hodiny');
  assert.equal(r.hours, 200, 'hodiny se u paušálisty musí pořád počítat');
});

test('hodinová práce se platí podle výkazů', () => {
  const r = payFor('jan@x.cz', measice(2026, 8), [
    { email: 'jan@x.cz', date: '2026-09-03', hours: 10 },
  ], recordOn);

  assert.equal(r.fixed, 0);
  assert.equal(r.hourly, 8000);
  assert.deepEqual(r.types, ['hourly']);
});

test('celý rok: paušál za každý měsíc, včetně zvýšení uprostřed', () => {
  const r = payFor('eva@x.cz', measice(2026, 0, 1, 2, 3, 4, 5, 6, 7, 8), [], recordOn);
  assert.equal(r.fixed, 8 * 80000 + 88000, 'zvýšení od září se nepromítlo');
});

test('přechod z paušálu na hodinovku uprostřed roku dá obojí', () => {
  const r = payFor('petr@x.cz', measice(2026, 0, 1, 2, 3, 4, 5, 6, 7, 8), [
    { email: 'petr@x.cz', date: '2026-08-10', hours: 20 },   // už hodinovka
    { email: 'petr@x.cz', date: '2026-03-10', hours: 15 },   // ještě paušál, neplatí se
  ], recordOn);

  assert.equal(r.fixed, 7 * 60000, 'leden–červenec na paušálu');
  assert.equal(r.hourly, 20000, 'březnové hodiny se neměly platit zvlášť');
  assert.deepEqual(r.types.sort(), ['hourly', 'monthly']);
});

test('člověk bez sazby nedostane nic, ale hodiny se spočítají', () => {
  const r = payFor('nikdo@x.cz', measice(2026, 8), [
    { email: 'nikdo@x.cz', date: '2026-09-03', hours: 8 },
  ], recordOn);

  assert.equal(r.total, 0);
  assert.equal(r.hours, 8);
  assert.deepEqual(r.types, []);
});

test('okna období', () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  assert.equal(monthsOf('month').length, 1);
  assert.deepEqual(monthsOf('month'), [{ year: y, month: m }]);
  assert.equal(monthsOf('lastyear').length, 12);
  assert.equal(monthsOf('year').length, m + 1, '„tento rok" má být leden až teď');

  const next = monthsOf('nextmonth')[0];
  assert.equal(next.month, m === 11 ? 0 : m + 1);
  assert.equal(next.year, m === 11 ? y + 1 : y);
});

test('přelom roku u minulého a příštího měsíce', () => {
  // leden: minulý měsíc je prosinec loňska
  const jan = [{ year: 2026, month: 0 }];
  assert.equal(boundsOf(jan)[0], '2026-01-01');
  assert.equal(boundsOf(jan)[1], '2026-01-31');

  // únor v přestupném roce
  assert.equal(boundsOf([{ year: 2028, month: 1 }])[1], '2028-02-29');
  assert.equal(boundsOf([{ year: 2026, month: 1 }])[1], '2026-02-28');
});

test('popis období', () => {
  assert.equal(rangeLabel([{ year: 2026, month: 8 }]), 'září 2026');
  assert.equal(rangeLabel(measice(2026, 0, 1, 2)), 'leden – březen 2026');
});

test('hodinovka paušálu se odvodí z částky a hodin', () => {
  assert.equal(hourlyOf(RATES[1]), 500);   // 80000 / 160
  assert.equal(hourlyOf(RATES[0]), 550);   // 88000 / 160
  assert.equal(hourlyOf(RATES[2]), 800);
  assert.equal(hourlyOf({ type: 'monthly', monthly_amount: 50000, monthly_hours: 0 }), null);
  assert.equal(hourlyOf(null), null);
});
