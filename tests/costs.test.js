import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeIn, amountForMonth, monthlyEquivalent, normalize, parseDay, sameMonth,
} from '../src/modules/costs/model.js';
import { MONTH_NAMES, MONTH_IN } from '../src/util.js';

// Pravidla: měsíční položka odejde každý měsíc, dokud platí. Roční odejde celá
// v jednom měsíci — ne po dvanáctinách; dvanáctina je jen průměr do souhrnu.
// Jednorázová odejde v měsíci svého data.

const NAJEM = { kind: 'recurring', period: 'monthly', name: 'Nájem', amount: 30000, valid_from: '2026-01-01', valid_to: null };
const POJISTKA = { kind: 'recurring', period: 'yearly', due_month: 3, name: 'Pojištění', amount: 24000, valid_from: '2026-01-01', valid_to: null };
const SKONCILO = { kind: 'recurring', period: 'monthly', name: 'Staré CRM', amount: 5000, valid_from: '2025-01-01', valid_to: '2026-06-30' };
const OPRAVA = { kind: 'onetime', name: 'Oprava auta', amount: 30000, due_date: '2026-11-12' };

const month = (y, m) => new Date(y, m - 1, 1);

test('měsíční položka odejde v každém měsíci platnosti', () => {
  assert.equal(amountForMonth(NAJEM, month(2026, 1)), 30000);
  assert.equal(amountForMonth(NAJEM, month(2026, 9)), 30000);
  assert.equal(amountForMonth(NAJEM, month(2027, 4)), 30000, 'bez „platí do" platí i příští rok');
  assert.equal(amountForMonth(NAJEM, month(2025, 12)), 0, 'před začátkem platnosti nic');
});

test('roční položka odejde celá v jednom měsíci, ne po dvanáctinách', () => {
  assert.equal(amountForMonth(POJISTKA, month(2026, 3)), 24000);
  assert.equal(amountForMonth(POJISTKA, month(2026, 2)), 0);
  assert.equal(amountForMonth(POJISTKA, month(2027, 3)), 24000, 'roční se opakuje i příští rok');
});

test('položka po konci platnosti do výhledu nespadne', () => {
  assert.equal(amountForMonth(SKONCILO, month(2026, 6)), 5000, 'poslední měsíc ještě platí');
  assert.equal(amountForMonth(SKONCILO, month(2026, 7)), 0);
});

test('platnost se počítá překryvem s měsícem, ne jen začátkem', () => {
  // Začátek uprostřed měsíce znamená, že ten měsíc už platí.
  const odPoloviny = { ...NAJEM, valid_from: '2026-09-15' };
  assert.equal(activeIn(odPoloviny, month(2026, 9)), true);
  assert.equal(activeIn(odPoloviny, month(2026, 8)), false);

  // A konec uprostřed měsíce znamená, že ten měsíc ještě platil.
  const doPoloviny = { ...NAJEM, valid_to: '2026-09-15' };
  assert.equal(activeIn(doPoloviny, month(2026, 9)), true);
  assert.equal(activeIn(doPoloviny, month(2026, 10)), false);
});

test('jednorázový náklad padne do měsíce svého data, i přes přelom roku', () => {
  assert.equal(amountForMonth(OPRAVA, month(2026, 11)), 30000);
  assert.equal(amountForMonth(OPRAVA, month(2026, 12)), 0);

  const leden = { ...OPRAVA, due_date: '2027-01-04' };
  assert.equal(amountForMonth(leden, month(2027, 1)), 30000);
  assert.equal(amountForMonth(leden, month(2026, 1)), 0, 'rok se musí shodovat, ne jen měsíc');
});

test('měsíční průměr rozpouští roční položku na dvanáctiny', () => {
  const zari = month(2026, 9);
  assert.equal(monthlyEquivalent([NAJEM, POJISTKA], zari), 30000 + 2000);
  assert.equal(monthlyEquivalent([NAJEM, OPRAVA], zari), 30000, 'jednorázové do průměru nepatří');
  assert.equal(monthlyEquivalent([], zari), 0);
});

test('měsíční průměr nepočítá ukončené položky', () => {
  // Jinak by dlaždice a souhrn říkaly vyšší číslo než výhled — a jedno z nich
  // by lhalo. SKONCILO platí do 30. 6. 2026.
  assert.equal(monthlyEquivalent([NAJEM, SKONCILO], month(2026, 6)), 35000, 'v červnu ještě platí');
  assert.equal(monthlyEquivalent([NAJEM, SKONCILO], month(2026, 7)), 30000, 'v červenci už ne');
});

test('průměr sedí se součtem měsíců u položky, která v roce skončí', () => {
  // Kontrola proti sobě: co průměr tvrdí o měsíci, musí sedět s tím, co do
  // toho měsíce opravdu spadne (u měsíčních položek, kde je to totéž).
  for (const m of [month(2026, 5), month(2026, 6), month(2026, 7)]) {
    assert.equal(monthlyEquivalent([SKONCILO], m), amountForMonth(SKONCILO, m));
  }
});

test('sameMonth rozlišuje rok, ne jen měsíc', () => {
  assert.equal(sameMonth(parseDay('2026-02-01'), month(2026, 2)), true);
  assert.equal(sameMonth(parseDay('2027-02-01'), month(2026, 2)), false);
});

// ── Tvar řádku ──

test('nula je platná částka, nevyplněno není', () => {
  assert.equal(normalize({ kind: 'recurring', name: 'Něco', amount: '0' }).amount, 0);
  assert.equal(normalize({ kind: 'recurring', name: 'Něco', amount: '' }), null);
  assert.equal(normalize({ kind: 'recurring', name: 'Něco', amount: '-5' }), null);
});

test('položka bez názvu neprojde', () => {
  assert.equal(normalize({ kind: 'recurring', name: '   ', amount: '100' }), null);
});

test('roční platba potřebuje měsíc', () => {
  assert.equal(normalize({ kind: 'recurring', period: 'yearly', name: 'X', amount: '100' }), null);
  const ok = normalize({ kind: 'recurring', period: 'yearly', due_month: '3', name: 'X', amount: '100' });
  assert.equal(ok.due_month, 3);
  assert.equal(ok.due_date, null, 'pravidelná položka nemá mít datum splatnosti');
});

test('měsíční platba měsíc nemá, i kdyby ho formulář poslal', () => {
  // Check constraint v databázi by to odmítl; ozvat se má dřív a bez dotazu.
  const row = normalize({ kind: 'recurring', period: 'monthly', due_month: '3', name: 'X', amount: '100' });
  assert.equal(row.due_month, null);
});

test('jednorázová položka potřebuje datum a nemá periodu', () => {
  assert.equal(normalize({ kind: 'onetime', name: 'X', amount: '100' }), null);
  const row = normalize({ kind: 'onetime', name: 'X', amount: '100', due_date: '2026-11-12' });
  assert.equal(row.due_date, '2026-11-12');
  assert.equal(row.period, null);
  assert.equal(row.valid_from, null, 'jednorázová nemá platnost od–do');
});

test('konec platnosti před začátkem neprojde', () => {
  const patch = { kind: 'recurring', period: 'monthly', name: 'X', amount: '100', valid_from: '2026-05-01' };
  assert.equal(normalize({ ...patch, valid_to: '2026-04-30' }), null);
  assert.ok(normalize({ ...patch, valid_to: '2026-05-01' }), 'stejný den je platný rozsah');
});

// ── Skloňování ──

test('měsíce mají vlastní tvar pro šesté pádě, ne přilepené „u"', () => {
  // „ročně v březenu" vypadá jako chyba programu, protože to chyba programu je.
  assert.equal(MONTH_IN.length, MONTH_NAMES.length);
  assert.equal(MONTH_IN[2], 'březnu');
  assert.equal(MONTH_IN[6], 'červenci', 'červenec nekončí na -u');
  assert.equal(MONTH_IN[8], 'září', 'září se neskloňuje');
  assert.equal(MONTH_IN[11], 'prosinci');

  // Devět z dvanácti se od prvního pádu liší víc než koncovkou — kdyby se
  // tvary generovaly, tenhle test to chytí.
  const jinyKmen = MONTH_IN.filter((v, i) => v !== MONTH_NAMES[i] + 'u');
  assert.equal(jinyKmen.length, 10, 'tvary se generují místo aby se vypsaly');
});
