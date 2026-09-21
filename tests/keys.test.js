import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyAction } from '../src/util.js';

// Klávesnice je zkratka navíc, ne náhrada tlačítek. Pravidla jsou tři:
// Enter v jednořádkovém poli potvrdí, v textarea až Cmd/Ctrl+Enter, Esc ruší.

const k = (key, tag, meta = false) => keyAction({ key, tag, meta });

test('Enter v jednořádkovém poli potvrdí', () => {
  assert.equal(k('Enter', 'INPUT'), 'submit');
  assert.equal(k('Enter', 'SELECT'), 'submit');
});

test('Enter v textarea dělá nový řádek, ne uložení', () => {
  // Kdyby potvrzoval, nešel by napsat víceřádkový popis — a to je půlka
  // formulářů v aplikaci.
  assert.equal(k('Enter', 'TEXTAREA'), null);
  assert.equal(k('Enter', 'TEXTAREA', true), 'submit', 'Cmd/Ctrl+Enter potvrdí');
});

test('Cmd+Enter funguje i v jednořádkovém poli', () => {
  // Ať nemusíš přemýšlet, v jakém poli zrovna jsi.
  assert.equal(k('Enter', 'INPUT', true), 'submit');
});

test('na tlačítku a odkazu se Enter neodchytává', () => {
  // Prohlížeč na nich Enter převede na klik sám; odchytit ho znamená
  // provést akci dvakrát.
  assert.equal(k('Enter', 'BUTTON'), null);
  assert.equal(k('Enter', 'A'), null);
});

test('Esc ruší odkudkoli, i z tlačítka', () => {
  assert.equal(k('Escape', 'INPUT'), 'cancel');
  assert.equal(k('Escape', 'TEXTAREA'), 'cancel');
  assert.equal(k('Escape', 'BUTTON'), 'cancel');
});

test('ostatní klávesy nedělají nic', () => {
  for (const key of ['a', 'Tab', 'ArrowDown', 'Shift', ' ']) {
    assert.equal(k(key, 'INPUT'), null, `${key} nemá nic dělat`);
  }
});
