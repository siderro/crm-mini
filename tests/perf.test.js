import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthsFor, monthKey, lastDayIso, pct, shortName, fmtHours } from '../src/modules/perf/logic.js';
import { rangeBounds as profitRange, inRange as profitInRange } from '../src/modules/profit/logic.js';

// Výkon se dívá zpátky — je to odvedená práce, ne plán.

test('okna období se dívají zpátky', () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const last12 = monthsFor('last12');
  assert.equal(last12.length, 12);
  assert.equal(monthKey(last12.at(-1)), monthKey(now), 'poslední karta musí být tenhle měsíc');

  assert.equal(monthsFor('year').length, m + 1, '„tento rok" končí teď, ne v prosinci');
  assert.equal(monthsFor('lastyear').length, 12);
  assert.equal(monthsFor('lastyear')[0].getFullYear(), y - 1);
});

test('posledních 12 měsíců přeteče správně přes rok', () => {
  // leden 2026 → prvních 12 měsíců zpět začíná únorem 2025
  const jan = monthsFor('last12').length;
  assert.equal(jan, 12);
});

test('poslední den měsíce — i únor v přestupném roce', () => {
  assert.equal(lastDayIso(new Date(2026, 8, 1)), '2026-09-30');
  assert.equal(lastDayIso(new Date(2026, 1, 1)), '2026-02-28');
  assert.equal(lastDayIso(new Date(2028, 1, 1)), '2028-02-29');
  assert.equal(lastDayIso(new Date(2026, 11, 1)), '2026-12-31');
});

/** Kapacita se počítá ze sazby platné ke konci měsíce — jako v modulu. */
function capacity(users, recordOn, month) {
  const end = lastDayIso(month);
  return users.reduce((sum, u) => {
    const r = recordOn(u.email, end);
    return sum + (r?.type === 'monthly' ? Number(r.monthly_hours) || 0 : 0);
  }, 0);
}

test('kapacitu tvoří jen paušály a bere se sazba ke konci měsíce', () => {
  const rates = [
    { email: 'eva@x.cz', type: 'monthly', monthly_hours: 120, valid_from: '2026-09-15' },
    { email: 'eva@x.cz', type: 'monthly', monthly_hours: 160, valid_from: '2026-01-01' },
    { email: 'jan@x.cz', type: 'hourly', rate: 800, valid_from: '2026-01-01' },
  ];
  const recordOn = (email, date) => rates.find((r) => r.email === email && r.valid_from <= date) || null;
  const users = [{ email: 'eva@x.cz' }, { email: 'jan@x.cz' }];

  assert.equal(capacity(users, recordOn, new Date(2026, 7, 1)), 160, 'srpen: ještě 160 h');
  assert.equal(capacity(users, recordOn, new Date(2026, 8, 1)), 120, 'změna od 15. 9. platí pro celé září');
  assert.equal(capacity([{ email: 'jan@x.cz' }], recordOn, new Date(2026, 8, 1)), 0, 'hodinový do kapacity nepatří');
});

test('procenta', () => {
  assert.equal(pct(137, 160), 86);
  assert.equal(pct(160, 160), 100);
  assert.equal(pct(50, 0), null, 'dělení nulou musí vrátit null, ne Infinity');
  assert.equal(pct(0, 160), 0);
});

test('jméno do úzké karty', () => {
  assert.equal(shortName('jakub@svejda-goldmann.cz'), 'jakub');
  assert.equal(shortName('bez-zavinace'), 'bez-zavinace');
});

test('hodiny bez zbytečných desetinných míst', () => {
  assert.equal(fmtHours(4), '4');
  assert.equal(fmtHours(4.5), '4,5');
  assert.equal(fmtHours(4.04), '4');
});

test('ziskovost projektů: období podle data uzavření', () => {
  const y = new Date().getFullYear();
  assert.deepEqual(profitRange('year'), [`${y}-01-01`, null]);
  assert.deepEqual(profitRange('lastyear'), [`${y - 1}-01-01`, `${y}-01-01`]);
  assert.deepEqual(profitRange('all'), [null, null]);

  // hranice roku: 31. 12. patří do loňska, 1. 1. do letoška
  assert.equal(profitInRange(`${y - 1}-12-31T23:00:00Z`, profitRange('lastyear')), true);
  assert.equal(profitInRange(`${y}-01-01T00:00:00Z`, profitRange('lastyear')), false);
  assert.equal(profitInRange(`${y}-01-01T00:00:00Z`, profitRange('year')), true);
});
