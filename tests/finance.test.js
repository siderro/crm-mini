import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthsFor, parseDay, addDays, monthKey,
  foldMonths, horizonTotals, sourceTotal, makeCache, enabledFrom,
} from '../src/modules/finance/logic.js';
import { INVOICE_LAG_DAYS, invoiceAmount, bucketProjects } from '../src/modules/finance/sources/invoices.js';
import { runsInMonth, slaForMonth } from '../src/modules/finance/sources/sla.js';
import { lastDayIso, fixedForMonth } from '../src/modules/finance/sources/payroll.js';

// Pravidla: fakturace = odhadovaný konec + odstup na vystavení, částka je
// cena projektu i s PM. SLA je zvlášť — účtuje se za každý kalendářní měsíc,
// ve kterém projekt běží. Náklady jdou proti tomu se záporným znaménkem.

const ALFA = { id: 'alfa', name: 'Alfa', billing: 'client', est_start: '2026-09-01', est_end: '2026-11-15', est_price: 400000, est_pm: 60000, est_sla: 12000 };
const BETA = { id: 'beta', name: 'Beta', billing: 'client', est_start: '2026-10-10', est_end: '2026-10-20', est_sla: 5000 };
const GAMA = { id: 'gama', name: 'Gama', billing: 'client', est_start: '2026-08-01', est_end: '2027-02-28', est_sla: 8000 };
const BEZ_SLA = { id: 'bez', name: 'Bez', billing: 'client', est_start: '2026-09-01', est_end: '2026-12-01' };
const BEZ_ZACATKU = { id: 'nozac', name: 'Nozac', billing: 'client', est_start: null, est_end: '2026-10-01', est_sla: 9000 };
const PRO_BONO = { id: 'pb', name: 'PB', billing: 'probono', est_start: '2026-09-01', est_end: '2026-10-01', est_price: 100000, est_sla: 5000 };

const month = (y, m) => new Date(y, m - 1, 1);

// ── Fakturace ──

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

test('projekty se třídí na naplánované, propadlé, bez data a nefakturované', () => {
  const dnes = new Date(2026, 9, 1);   // 1. října 2026
  const b = bucketProjects([ALFA, BETA, BEZ_ZACATKU, PRO_BONO, { ...BEZ_SLA, est_end: null }], dnes);

  assert.deepEqual(b.planned.map((i) => i.project.id), ['alfa', 'beta', 'nozac']);
  assert.deepEqual(b.overdue.map((i) => i.project.id), []);
  assert.deepEqual(b.undated.map((p) => p.id), ['bez']);
  assert.deepEqual(b.unbilled.map((p) => p.id), ['pb'], 'pro bono nepatří mezi naplánované');
});

test('projekt s propadlým datem fakturace je po termínu, ne tiše pryč', () => {
  const dnes = new Date(2026, 11, 31);
  const b = bucketProjects([ALFA], dnes);
  assert.equal(b.planned.length, 0);
  assert.deepEqual(b.overdue.map((i) => i.project.id), ['alfa']);
});

// ── SLA ──

test('SLA běží v každém měsíci, který se překrývá s termíny', () => {
  assert.equal(runsInMonth(GAMA, month(2026, 8)), true, 'první měsíc');
  assert.equal(runsInMonth(GAMA, month(2026, 12)), true, 'uprostřed');
  assert.equal(runsInMonth(GAMA, month(2027, 2)), true, 'poslední měsíc přes přelom roku');
  assert.equal(runsInMonth(GAMA, month(2027, 3)), false, 'po konci už ne');
  assert.equal(runsInMonth(BEZ_ZACATKU, month(2026, 10)), false, 'bez termínů se plánovat nedá');
});

test('SLA za měsíc sčítá jen fakturovatelné projekty s SLA', () => {
  const projekty = [ALFA, BETA, GAMA, BEZ_SLA, PRO_BONO];
  const rijen = slaForMonth(projekty, month(2026, 10));
  assert.equal(rijen.count, 3);
  assert.equal(rijen.amount, 12000 + 5000 + 8000);
  assert.equal(slaForMonth(projekty, month(2026, 11)).amount, 12000 + 8000, 'krátký projekt už neběží');
});

// ── Skládání zdrojů ──
//
// Falešné zdroje: logic.js nesmí o financích vědět nic, takže se dá otestovat
// bez jediného projektu a bez databáze.

const prijem = {
  id: 'prijem', sign: +1,
  amountFor: (data, m) => data[monthKey(m)] || 0,
  itemsFor: (data, m) => (data[monthKey(m)] ? [{ label: 'příjem', amount: data[monthKey(m)] }] : []),
};
const vydaj = { id: 'vydaj', sign: -1, amountFor: (data, m) => data[monthKey(m)] || 0 };

const LEDEN = month(2027, 1);
const UNOR = month(2027, 2);

test('zdroje se sčítají podle znaménka', () => {
  const folded = foldMonths([LEDEN, UNOR], [prijem, vydaj], {
    prijem: { '2027-0': 100000, '2027-1': 50000 },
    vydaj: { '2027-0': 30000, '2027-1': 80000 },
  });

  assert.equal(folded[0].income, 100000);
  assert.equal(folded[0].expense, 30000);
  assert.equal(folded[0].net, 70000);
  assert.equal(folded[1].net, -30000, 'měsíc, kdy odejde víc, než přijde');
});

test('měsíc bez jediné položky vrací nuly, ne prázdno', () => {
  // Díra ve výhledu je informace a musí jít vykreslit.
  const [m] = foldMonths([LEDEN], [prijem, vydaj], { prijem: {}, vydaj: {} });
  assert.equal(m.income, 0);
  assert.equal(m.expense, 0);
  assert.equal(m.net, 0);
  assert.deepEqual(m.rows.map((r) => r.amount), [0, 0]);
});

test('vypnutý zdroj se do součtu nepočítá', () => {
  const data = { prijem: { '2027-0': 100000 }, vydaj: { '2027-0': 30000 } };
  const jenPrijem = foldMonths([LEDEN], [prijem], data);
  assert.equal(jenPrijem[0].net, 100000, 'vypnutý výdaj nesmí zůstatek snížit');
  assert.equal(jenPrijem[0].expense, 0);
});

test('součty za horizont a za jeden zdroj', () => {
  const folded = foldMonths([LEDEN, UNOR], [prijem, vydaj], {
    prijem: { '2027-0': 100000, '2027-1': 50000 },
    vydaj: { '2027-0': 30000, '2027-1': 80000 },
  });

  assert.deepEqual(horizonTotals(folded), { income: 150000, expense: 110000, net: 40000 });
  assert.equal(sourceTotal(folded, 'prijem'), 150000);
  assert.equal(sourceTotal(folded, 'neznamy'), 0, 'neznámý zdroj je nula, ne výjimka');
});

test('zdroj bez itemsFor nespadne, jen nemá rozpad', () => {
  const [m] = foldMonths([LEDEN], [vydaj], { vydaj: { '2027-0': 30000 } });
  assert.deepEqual(m.rows[0].items, []);
  assert.equal(m.expense, 30000);
});

// ── Měsíce v horizontu ──

test('výhled se nikdy nekouká zpátky', () => {
  const dnes = new Date(2026, 8, 21);   // 21. září 2026

  const dvanact = monthsFor('next12', dnes);
  assert.equal(dvanact.length, 12);
  assert.equal(monthKey(dvanact[0]), '2026-8', 'začíná tímhle měsícem, ne lednem');
  assert.equal(monthKey(dvanact[11]), '2027-7');

  assert.equal(monthsFor('year', dnes).length, 4, '„tento rok" je zbytek roku');
  assert.equal(monthKey(monthsFor('nextyear', dnes)[0]), '2027-0');
});

// ── Mzdy (jen paušály) ──

test('paušál se bere podle sazby platné k poslednímu dni měsíce', () => {
  assert.equal(lastDayIso(month(2027, 2)), '2027-02-28');
  assert.equal(lastDayIso(month(2028, 2)), '2028-02-29', 'přestupný únor');

  const SAZBY = {
    'anna@x.cz': { type: 'monthly', monthly_amount: 72000 },
    'bob@x.cz': { type: 'hourly', rate: 800 },
  };
  const recordOn = (email) => SAZBY[email] || null;

  assert.equal(fixedForMonth(['anna@x.cz', 'bob@x.cz'], month(2027, 1), recordOn), 72000,
    'hodinový člověk do předvídatelných mezd nepatří');
  assert.equal(fixedForMonth(['nikdo@x.cz'], month(2027, 1), recordOn), 0,
    'člověk bez sazby je nula, ne NaN');
});

// ── Sdílená paměť ──

test('dva zdroje si o totéž řeknou jednou', () => {
  // Bez tohohle by fakturace a SLA načetly projekty každá zvlášť.
  let volani = 0;
  const cache = makeCache();
  const nacti = () => { volani += 1; return Promise.resolve('data'); };

  cache.once('projects', nacti);
  cache.once('projects', nacti);
  assert.equal(volani, 1);
});

// ── Volba zdrojů ──

const ZNAME = ['invoices', 'sla', 'recurring', 'onetime', 'payroll'];
const VYCHOZI = ['invoices', 'sla', 'recurring', 'onetime'];

test('vypnout všechny zdroje musí jít', () => {
  // Past: uložené prázdné pole není totéž co „nic uloženého". Kdyby se i na něj
  // sáhlo výchozími zdroji, nešel by poslední zdroj vypnout — samo by se
  // to zase zaplo a prázdný stav by byl nedosažitelný.
  assert.deepEqual(enabledFrom([], ZNAME, VYCHOZI), []);
});

test('bez uložené volby platí výchozí zdroje', () => {
  assert.deepEqual(enabledFrom(null, ZNAME, VYCHOZI), VYCHOZI);
  assert.deepEqual(enabledFrom(undefined, ZNAME, VYCHOZI), VYCHOZI);
  assert.deepEqual(enabledFrom('nesmysl', ZNAME, VYCHOZI), VYCHOZI);
});

test('neznámý zdroj se zahodí, zbytek zůstane', () => {
  // Přejmenovaný zdroj nesmí shodit celou volbu ani se tiše počítat.
  assert.deepEqual(enabledFrom(['sla', 'zruseny', 'payroll'], ZNAME, VYCHOZI), ['sla', 'payroll']);
});

test('mzdy nejsou mezi výchozími zdroji', () => {
  // Hodinová práce se dopředu spočítat nedá; zapnuté a nepopsané by to lhalo.
  assert.ok(!VYCHOZI.includes('payroll'));
});
