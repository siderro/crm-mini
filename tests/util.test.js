import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, formatDate, formatDateTime, formatMoney, formatMoneyShort, ageShort, timeAgo } from '../src/util.js';

test('esc zneškodní všech pět znaků', () => {
  assert.equal(esc('<script>'), '&lt;script&gt;');
  assert.equal(esc('a & b'), 'a &amp; b');
  assert.equal(esc(`"uvozovky"`), '&quot;uvozovky&quot;');
  assert.equal(esc("'apostrof'"), '&#39;apostrof&#39;');
  // ampersand musí jít první, jinak by se dvakrát escapoval
  assert.equal(esc('&lt;'), '&amp;lt;');
});

test('esc snese prázdné i nulové hodnoty', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(0), '0');
  assert.equal(esc(false), 'false');
});

test('formatMoney', () => {
  assert.equal(formatMoney(0), '0 Kč');
  assert.equal(formatMoney(null), '');
  assert.equal(formatMoney(''), '');
  assert.equal(formatMoney('nesmysl'), '');
  assert.match(formatMoney(1250000), /^1.250.000 Kč$/);
});

test('formatMoneyShort na hranicích zkracování', () => {
  assert.match(formatMoneyShort(9999), /9.999 Kč/);   // ještě plné
  assert.equal(formatMoneyShort(10000), '10k Kč');    // už zkrácené
  assert.equal(formatMoneyShort(300000), '300k Kč');
  assert.equal(formatMoneyShort(999000), '999k Kč');
  assert.equal(formatMoneyShort(1000000), '1M Kč');
  assert.equal(formatMoneyShort(1250000), '1,3M Kč');
  assert.equal(formatMoneyShort(null), '');
});

test('ageShort: pod den v hodinách, výš ve dnech', () => {
  const now = Date.now();
  assert.equal(ageShort(new Date(now - 5 * 3600000).toISOString()), '5 h');
  assert.equal(ageShort(new Date(now - 23 * 3600000).toISOString()), '23 h');
  assert.equal(ageShort(new Date(now - 25 * 3600000).toISOString()), '1 d');
  assert.equal(ageShort(new Date(now - 72 * 3600000).toISOString()), '3 d');
  assert.equal(ageShort(null), '');
});

test('formatDate a formatDateTime na nesmyslech mlčí', () => {
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('nesmysl'), '');
  assert.equal(formatDateTime(null), '');
  assert.equal(formatDateTime('nesmysl'), '');
  assert.match(formatDate('2026-09-11'), /11\.\s?09\.\s?2026/);
});

test('timeAgo', () => {
  const now = Date.now();
  assert.equal(timeAgo(null), 'nikdy');
  assert.equal(timeAgo(new Date(now).toISOString()), 'dnes');
  assert.equal(timeAgo(new Date(now - 86400000).toISOString()), 'včera');
});
