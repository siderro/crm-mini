import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pick, hourlyOf, today, TYPES } from '../src/modules/rates/model.js';

// Jádro celého systému: sazba se k výkazu páruje podle DATA VÝKAZU, ne podle
// dneška. Kdyby se to porušilo, zpětná změna sazby přepíše historii nákladů.

const ROWS = [
  { email: 'jan@x.cz', type: 'hourly', rate: 1200, valid_from: '2027-01-01' },
  { email: 'jan@x.cz', type: 'hourly', rate: 950, valid_from: '2026-09-05' },
  { email: 'jan@x.cz', type: 'hourly', rate: 800, valid_from: '2026-01-01' },
  { email: 'eva@x.cz', type: 'monthly', monthly_amount: 80000, monthly_hours: 160, valid_from: '2026-01-01' },
];

test('vybere se poslední verze, jejíž platnost už nastala', () => {
  assert.equal(hourlyOf(pick(ROWS, 'jan@x.cz', '2025-12-31')), null, 'před první verzí nesmí nic platit');
  assert.equal(hourlyOf(pick(ROWS, 'jan@x.cz', '2026-01-01')), 800, 'den platnosti se počítá');
  assert.equal(hourlyOf(pick(ROWS, 'jan@x.cz', '2026-09-04')), 800);
  assert.equal(hourlyOf(pick(ROWS, 'jan@x.cz', '2026-09-05')), 950);
  assert.equal(hourlyOf(pick(ROWS, 'jan@x.cz', '2026-12-31')), 950, 'budoucí verze nesmí platit dřív');
  assert.equal(hourlyOf(pick(ROWS, 'jan@x.cz', '2027-06-01')), 1200);
});

test('neznámý člověk nemá sazbu', () => {
  assert.equal(pick(ROWS, 'nikdo@x.cz', '2026-09-01'), null);
});

test('paušál se převede na hodinovku', () => {
  assert.equal(hourlyOf(pick(ROWS, 'eva@x.cz', '2026-09-01')), 500);
});

test('rozbitý paušál radši nic než nesmysl', () => {
  assert.equal(hourlyOf({ type: 'monthly', monthly_amount: 80000, monthly_hours: 0 }), null);
  assert.equal(hourlyOf({ type: 'monthly', monthly_amount: 80000, monthly_hours: null }), null);
  assert.equal(hourlyOf({ type: 'monthly', monthly_amount: null, monthly_hours: 160 }), null);
  assert.equal(hourlyOf({ type: 'hourly', rate: null }), null);
});

test('typy sazeb', () => {
  assert.deepEqual(TYPES, ['hourly', 'monthly']);
});

test('today vrací lokální den ve tvaru YYYY-MM-DD', () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  const now = new Date();
  assert.equal(today().slice(0, 4), String(now.getFullYear()));
});
