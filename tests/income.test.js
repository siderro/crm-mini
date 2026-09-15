import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INVOICE_LAG_DAYS, monthsFor, parseDay, addDays, monthKey,
  runsInMonth, slaForMonth, invoiceAmount,
} from '../src/modules/income/logic.js';

// Pravidla: fakturace = odhadovaný konec + odstup na vystavení, částka je
// cena projektu i s PM. SLA je zvlášť — účtuje se za každý kalendářní měsíc,
// ve kterém projekt běží.

const ALFA = { id: 'alfa', billing: 'client', est_start: '2026-09-01', est_end: '2026-11-15', est_price: 400000, est_pm: 60000, est_sla: 12000 };
const BETA = { id: 'beta', billing: 'client', est_start: '2026-10-10', est_end: '2026-10-20', est_sla: 5000 };
const GAMA = { id: 'gama', billing: 'client', est_start: '2026-08-01', est_end: '2027-02-28', est_sla: 8000 };
const BEZ_SLA = { id: 'bez', billing: 'client', est_start: '2026-09-01', est_end: '2026-12-01' };
const BEZ_ZACATKU = { id: 'nozac', billing: 'client', est_start: null, est_end: '2026-10-01', est_sla: 9000 };
const PRO_BONO = { id: 'pb', billing: 'probono', est_start: '2026-09-01', est_end: '2026-10-01', est_price: 100000, est_sla: 5000 };

test('částka faktury = cena projektu + project management', () => {
  assert.equal(invoiceAmount(ALFA), 460000);
  assert.equal(invoiceAmount({ ...ALFA, est_pm: null }), 400000);
  assert.equal(invoiceAmount(PRO_BONO), 0, 'pro bono nemá co fakturovat');
});

test('datum fakturace je konec projektu plus odstup', () => {
  assert.equal(INVOICE_LAG_DAYS, 20);
  const due = addDays(parseDay('2026-11-15'), INVOICE_LAG_DAYS);
  assert.equal(due.getFullYear(), 2026);
  assert.equal(due.getMonth(), 11);   // prosinec
  assert.equal(due.getDate(), 5);
});

test('fakturace přes přelom roku spadne do ledna', () => {
  const due = addDays(parseDay('2026-12-20'), INVOICE_LAG_DAYS);
  assert.equal(monthKey(due), '2027-0');
});

test('SLA běží v každém měsíci, který se překrývá s termíny', () => {
  const zari = new Date(2026, 8, 1);
  const rijen = new Date(2026, 9, 1);
  const prosinec = new Date(2026, 11, 1);

  assert.equal(runsInMonth(ALFA, zari), true);
  assert.equal(runsInMonth(ALFA, prosinec), false, 'projekt v prosinci už neběží');
  assert.equal(runsInMonth(BETA, rijen), true, 'projekt trvající půl měsíce se počítá');
  assert.equal(runsInMonth(GAMA, new Date(2027, 1, 1)), true, 'přesah do dalšího roku');
});

test('projekt bez začátku se do SLA nepočítá', () => {
  assert.equal(runsInMonth(BEZ_ZACATKU, new Date(2026, 8, 1)), false);
});

test('SLA za měsíc sečte všechny běžící projekty', () => {
  const projects = [ALFA, BETA, GAMA, BEZ_SLA, BEZ_ZACATKU];

  const zari = slaForMonth(projects, new Date(2026, 8, 1));
  assert.equal(zari.count, 2, 'Alfa a Gama');
  assert.equal(zari.amount, 20000);

  const rijen = slaForMonth(projects, new Date(2026, 9, 1));
  assert.equal(rijen.count, 3, 'Alfa, Beta i Gama');
  assert.equal(rijen.amount, 25000);

  const brezen = slaForMonth(projects, new Date(2027, 2, 1));
  assert.equal(brezen.count, 0);
});

test('pro bono neúčtuje ani SLA', () => {
  const s = slaForMonth([PRO_BONO], new Date(2026, 8, 1));
  assert.equal(s.count, 0);
});

test('okna období se dívají dopředu', () => {
  const now = new Date();
  const m = now.getMonth();

  assert.equal(monthsFor('next12', now).length, 12);
  assert.equal(monthsFor('next12', now)[0].getMonth(), m, 'výhled musí začínat teď');

  assert.equal(monthsFor('year', now).length, 12 - m, '„tento rok" je zbytek roku');
  assert.equal(monthsFor('nextyear', now).length, 12);
  assert.equal(monthsFor('nextyear', now)[0].getFullYear(), now.getFullYear() + 1);
});

test('parseDay nesmyslům nevěří', () => {
  assert.equal(parseDay(null), null);
  assert.equal(parseDay(''), null);
  assert.equal(parseDay('nesmysl'), null);
  assert.equal(parseDay('2026-09-11T10:00:00Z').getDate(), 11, 'ISO timestamp se má useknout na den');
});
