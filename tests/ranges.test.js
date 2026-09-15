import { test } from 'node:test';
import assert from 'node:assert/strict';

// To-Do a Timesheet mají filtry období uvnitř svých UI modulů. Ty jdou
// naimportovat i mimo prohlížeč — jen localStorage musí existovat dřív.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const todo = await import('../src/modules/todo/index.js');
const ts = await import('../src/modules/timesheet/index.js');

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

test('To-Do archiv: dnes a včera leží uvnitř tohoto týdne', () => {
  const today = daysAgo(0);
  const yesterday = daysAgo(1);

  assert.equal(todo.inRange(today, todo.rangeBounds('today')), true);
  assert.equal(todo.inRange(today, todo.rangeBounds('week')), true, 'dnešek musí patřit i do týdne');
  assert.equal(todo.inRange(today, todo.rangeBounds('yesterday')), false);

  assert.equal(todo.inRange(yesterday, todo.rangeBounds('yesterday')), true);
  assert.equal(todo.inRange(yesterday, todo.rangeBounds('today')), false);
});

test('To-Do archiv: „vše" pustí všechno, „starší" jen staré', () => {
  for (const n of [0, 1, 10, 400]) {
    assert.equal(todo.inRange(daysAgo(n), todo.rangeBounds('all')), true);
  }
  assert.equal(todo.inRange(daysAgo(400), todo.rangeBounds('older')), true);
  assert.equal(todo.inRange(daysAgo(0), todo.rangeBounds('older')), false);
});

test('To-Do archiv: týden začíná pondělím', () => {
  const [from] = todo.rangeBounds('week');
  assert.equal(new Date(from).getDay(), 1, 'týden nezačíná v pondělí');

  const [lastFrom, lastTo] = todo.rangeBounds('lastweek');
  assert.equal(lastTo - lastFrom, 7 * 86400000, 'minulý týden nemá sedm dní');
  assert.equal(lastTo, from, 'mezi týdny je díra nebo překryv');
});

test('To-Do archiv: nesmyslné datum spadne do „starší", ne nikam', () => {
  assert.equal(todo.inRange('nesmysl', todo.rangeBounds('older')), true);
});

test('Timesheet: hranice měsíců', () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  const [from, to] = ts.rangeBounds('month');
  assert.equal(from, `${y}-${m}-01`);
  assert.equal(to, null, 'tenhle měsíc nemá horní hranici');

  const [lastFrom, lastTo] = ts.rangeBounds('lastmonth');
  assert.equal(lastTo, from, 'minulý měsíc musí navazovat na tenhle');
  assert.ok(lastFrom < lastTo);
});

test('Timesheet: rok a vše', () => {
  const y = new Date().getFullYear();
  assert.deepEqual(ts.rangeBounds('year'), [`${y}-01-01`, null]);
  assert.deepEqual(ts.rangeBounds('all'), [null, null]);

  assert.equal(ts.inRange(`${y}-01-01`, ts.rangeBounds('year')), true);
  assert.equal(ts.inRange(`${y - 1}-12-31`, ts.rangeBounds('year')), false);
});

test('Timesheet: horní hranice je vylučující, dolní včetně', () => {
  const [from, to] = ts.rangeBounds('lastmonth');
  assert.equal(ts.inRange(from, [from, to]), true, 'první den měsíce vypadl');
  assert.equal(ts.inRange(to, [from, to]), false, 'první den dalšího měsíce se počítá dvakrát');
});

test('filtry mají popisky a výchozí volbu', () => {
  for (const mod of [todo, ts]) {
    assert.ok(mod.RANGES.length >= 3);
    assert.ok(mod.RANGES.every((r) => r.id && r.label));
    assert.ok(mod.RANGES.some((r) => r.id === mod.DEFAULT_RANGE), 'výchozí filtr neexistuje');
  }
});
