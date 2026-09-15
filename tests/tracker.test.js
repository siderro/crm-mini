import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Tracker si drží stav v localStorage — v Node ho musíme předstírat dřív,
// než se modul načte.
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

const T = await import('../src/modules/timesheet/tracker.js');

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

/** Posune začátek běžícího úseku do minulosti, ať se nemusí čekat. */
function backdate(ms) {
  const t = T.readTracker();
  store['brevis_tracker'] = JSON.stringify({
    ...t, startedAt: new Date(Date.now() - ms).toISOString(),
  });
}

test('bez stopek je naměřeno nula', () => {
  assert.equal(T.readTracker(), null);
  assert.equal(T.elapsedMs(null), 0);
});

test('start běží, pauza zmrazí, pokračování navazuje', () => {
  T.startTracker();
  backdate(60000);
  assert.equal(Math.round(T.elapsedMs(T.readTracker()) / 1000), 60);

  T.pauseTracker();
  const frozen = T.elapsedMs(T.readTracker());
  assert.equal(T.readTracker().running, false);
  assert.equal(T.elapsedMs(T.readTracker()), frozen, 'čas běžel i po pauze');

  T.resumeTracker();
  backdate(frozen + 30000);   // úsek navazuje na už naměřené
  assert.ok(T.elapsedMs(T.readTracker()) >= frozen, 'pokračování začalo od nuly');
});

test('stop zmrazí čas a čeká na uložení', () => {
  T.startTracker();
  backdate(3600000);
  const t = T.stopTracker();

  assert.equal(t.stopped, true);
  assert.equal(t.running, false);
  assert.equal(T.elapsedMs(t), t.elapsedMs, 'po stopu čas dál běží');
  assert.equal(Math.round(t.elapsedMs / 3600000), 1);
});

test('clear stopky zahodí', () => {
  T.startTracker();
  T.clearTracker();
  assert.equal(T.readTracker(), null);
});

test('formatDuration', () => {
  assert.equal(T.formatDuration(0), '0:00:00');
  assert.equal(T.formatDuration(59000), '0:00:59');
  assert.equal(T.formatDuration(3600000), '1:00:00');
  assert.equal(T.formatDuration(5025000), '1:23:45');
});

test('toHours: krátké měření se nezahodí, zaokrouhlí se nahoru na 0,01 h', () => {
  assert.equal(T.toHours(0), 0);
  assert.equal(T.toHours(1000), 0.01, 'sekunda spadla na nulu a nešla by uložit');
  assert.equal(T.toHours(18000), 0.01);
  assert.equal(T.toHours(900000), 0.25);
  assert.equal(T.toHours(5400000), 1.5);
});

test('trackedDay bere den, kdy měření začalo', () => {
  T.startTracker();
  const t = T.readTracker();
  store['brevis_tracker'] = JSON.stringify({ ...t, startedAt: '2026-01-15T23:30:00.000Z' });
  assert.equal(T.trackedDay(T.readTracker()), '2026-01-16');
});

test('rozbitý obsah v localStorage nespadne', () => {
  store['brevis_tracker'] = 'není json';
  assert.equal(T.readTracker(), null);
});
