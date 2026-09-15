import { test } from 'node:test';
import assert from 'node:assert/strict';

// Kontrakt modulu — co musí každý modul splňovat, aby ho hub, navigace
// a systém práv uměly obsloužit. Tenhle soubor je vymahatelná podoba
// toho, co je popsané v STANDARDS.md.
//
// Zároveň je to nejlevnější pojistka proti překlepu: kdyby některý modul
// přestal jít naimportovat (chybějící export, špatná cesta), spadne to tady,
// ne až v prohlížeči.

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { MODULES, MODULE_BY_ID } = await import('../src/modules/registry.js');
const { people } = await import('../src/modules/people/index.js');

const ALL = [...MODULES, people];

test('registr není prázdný a obsahuje očekávané moduly', () => {
  assert.ok(MODULES.length >= 10);
  for (const id of ['crm', 'todo', 'pm', 'timesheet', 'wiki']) {
    assert.ok(MODULE_BY_ID[id], `chybí modul ${id}`);
  }
});

test('každý modul má id, popisky a render', () => {
  for (const m of ALL) {
    assert.match(m.id, /^[a-z][a-z0-9-]*$/, `id "${m.id}" není malými písmeny s pomlčkami`);
    assert.ok(m.label?.length, `modul ${m.id} nemá label`);
    assert.ok(m.desc?.length, `modul ${m.id} nemá desc`);
    assert.equal(typeof m.render, 'function', `modul ${m.id} nemá render()`);
  }
});

test('id jsou jedinečná', () => {
  const ids = ALL.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, `duplicitní id: ${ids.join(', ')}`);
});

test('MODULE_BY_ID sedí s MODULES', () => {
  assert.equal(Object.keys(MODULE_BY_ID).length, MODULES.length);
  for (const m of MODULES) assert.equal(MODULE_BY_ID[m.id], m);
});

test('volitelné vlastnosti mají správný typ', () => {
  for (const m of ALL) {
    for (const flag of ['levels', 'settings', 'superadminOnly']) {
      if (flag in m) assert.equal(typeof m[flag], 'boolean', `${m.id}.${flag} není boolean`);
    }
    for (const hook of ['tileInfo', 'renderTile', 'renderMini']) {
      if (hook in m) assert.equal(typeof m[hook], 'function', `${m.id}.${hook} není funkce`);
    }
  }
});

test('dlaždice má buď data, nebo vlastní obsah — ne obojí', () => {
  for (const m of ALL) {
    assert.ok(!(m.tileInfo && m.renderTile),
      `${m.id} má tileInfo i renderTile; hub by nevěděl, co vykreslit`);
  }
});

test('modul jen pro superadmina se nedá nikomu zapnout', () => {
  // Kdyby byl v tabulce práv, šlo by ho omylem přidělit a UI by lhalo.
  const restricted = MODULES.filter((m) => m.superadminOnly).map((m) => m.id);
  assert.ok(restricted.length > 0, 'žádný modul není superadminOnly — opravdu?');
  for (const id of restricted) {
    assert.ok(!MODULE_BY_ID[id].levels,
      `${id} je superadminOnly a zároveň má úrovně — to si odporuje`);
  }
});

test('„Lidé" zůstávají mimo registr, aby nevznikl kruhový import', () => {
  // people/index.js si bere MODULES z registru; kdyby byl v něm, kruh by se uzavřel.
  assert.equal(MODULE_BY_ID['people'], undefined);
  assert.equal(people.id, 'people');
  assert.equal(people.settings, true);
});

test('moduly v nastavení nejsou v hlavní navigaci a naopak', () => {
  const settings = ALL.filter((m) => m.settings).map((m) => m.id);
  assert.ok(settings.includes('people'));
  assert.ok(settings.includes('project-access'));
  // hlavní navigace = zbytek; musí tam být to, co se používá denně
  const nav = MODULES.filter((m) => !m.settings).map((m) => m.id);
  for (const id of ['crm', 'todo', 'pm', 'timesheet']) assert.ok(nav.includes(id));
});
