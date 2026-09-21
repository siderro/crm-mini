import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, marginOf, monthSpan, isBillable } from '../src/modules/projects/model.js';
import { timeMeter, designMeter, pmMeter } from '../src/modules/projects/meters.js';

// Doménová pravidla, na kterých stojí všechny peníze v systému:
//   · design se měří v hodinách, PM v penězích, SLA stojí mimo ziskovost
//   · zisk se počítá až u uzavřeného projektu
//   · pro bono a interní nemají výnos

const ALFA = {
  id: 'alfa', status: 'active', billing: 'client',
  est_start: '2026-09-01', est_end: '2026-11-30',
  est_hours: 100, est_price: 400000, est_pm: 60000, est_sla: 12000,
};

const rate800 = () => 800;

const entry = (patch) => ({ email: 'jan@x.cz', date: '2026-09-05', hours: 10, kind: 'design', ...patch });

test('PM hodiny nevstupují do designového odhadu', () => {
  const s = compute(ALFA, [
    entry({ hours: 40, kind: 'design' }),
    entry({ hours: 25, kind: 'pm' }),
  ], rate800);

  assert.equal(s.design.hours, 40, 'do designu se připočetly PM hodiny');
  assert.equal(s.pm.hours, 25);
  assert.equal(s.total.hours, 65);
});

test('design: náklad a kolik zbývá z ceny', () => {
  const s = compute(ALFA, [entry({ hours: 40 })], rate800);
  assert.equal(s.design.cost, 32000);
  assert.equal(s.design.remainingMoney, 368000);
  assert.equal(s.design.overHours, 0);
});

test('přetečení odhadu hodin', () => {
  const s = compute({ ...ALFA, est_hours: 30 }, [entry({ hours: 40 })], rate800);
  assert.equal(s.design.overHours, 10);
});

test('PM se měří v penězích proti rozpočtu', () => {
  const s = compute(ALFA, [entry({ hours: 25, kind: 'pm' })], rate800);
  assert.equal(s.pm.cost, 20000);
  assert.equal(s.pm.budget, 60000);
  assert.equal(s.pm.remainingMoney, 40000);
  assert.equal(s.pm.over, 0);
});

test('přečerpaný PM rozpočet', () => {
  const s = compute(ALFA, [entry({ hours: 100, kind: 'pm' })], rate800);
  assert.equal(s.pm.over, 20000);
  assert.equal(s.pm.remainingMoney, -20000);
});

test('SLA se účtuje za každý započatý měsíc a stojí mimo marži', () => {
  const s = compute(ALFA, [], rate800);
  assert.equal(s.sla.monthly, 12000);
  assert.equal(s.sla.months, 3, 'září, říjen, listopad');
  assert.equal(s.sla.total, 36000);
});

test('SLA přes přelom roku', () => {
  assert.equal(monthSpan({ est_start: '2026-11-01', est_end: '2027-02-28' }), 4);
  assert.equal(monthSpan({ est_start: '2026-09-15', est_end: '2026-09-20' }), 1);
  assert.equal(monthSpan({ est_start: null, est_end: '2026-09-20' }), null);
  assert.equal(monthSpan({ est_start: '2026-09-20', est_end: '2026-09-01' }), null, 'konec před začátkem');
});

test('běžící projekt nemá zisk — jen spotřebu', () => {
  const s = compute(ALFA, [entry({ hours: 40 })], rate800);
  assert.equal(s.margin, null, 'u běžícího projektu se objevil zisk');
  assert.equal(s.closed, false);
});

test('uzavřený projekt zisk má, počítá se z fakturované ceny', () => {
  const closed = { ...ALFA, status: 'closed', closed_at: '2026-12-01T00:00:00Z', final_price: 380000 };
  const s = compute(closed, [entry({ hours: 40 })], rate800);

  assert.equal(s.margin.revenue, 380000, 'nepoužila se skutečně fakturovaná cena');
  assert.equal(s.margin.cost, 32000);
  assert.equal(s.margin.profit, 348000);
  assert.ok(Math.abs(s.margin.percent - 91.58) < 0.1);
});

test('pro bono a interní nemají marži, jen náklad', () => {
  for (const billing of ['probono', 'internal']) {
    const p = { ...ALFA, billing, status: 'closed', closed_at: '2026-12-01T00:00:00Z' };
    const s = compute(p, [entry({ hours: 40 })], rate800);
    assert.equal(s.margin, null, `${billing} má marži`);
    assert.equal(s.total.cost, 32000);
    assert.equal(isBillable(p), false);
  }
});

test('člověk bez sazby se do nákladu nezapočítá, ale řekne se to', () => {
  const s = compute(ALFA, [entry({ hours: 40 })], () => null);
  assert.equal(s.total.cost, 0);
  assert.equal(s.total.missingRate, true, 'chybějící sazba se tiše spolkla');
});

test('sazba se bere k datu výkazu, ne dnešní', () => {
  const rateByDate = (email, date) => (date < '2026-09-05' ? 800 : 950);
  const s = compute(ALFA, [
    entry({ date: '2026-09-01', hours: 10 }),
    entry({ date: '2026-09-10', hours: 10 }),
  ], rateByDate);
  assert.equal(s.design.cost, 800 * 10 + 950 * 10);
});

test('marginOf: nula výnosu nedělí nulou', () => {
  const m = marginOf(ALFA, 0, 5000);
  assert.equal(m.profit, -5000);
  assert.equal(m.percent, null);
});

// ── Měrky ──

test('měrka termínu: před začátkem, v běhu, po termínu', () => {
  const today = new Date();
  // Lokálně, ne přes toISOString(): parseDay() v meters.js staví lokální
  // půlnoc, takže UTC převod by po půlnoci posunul datum o den a měrka by
  // vyšla o jeden den vedle. (Přesně to se tu jednou stalo.)
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  assert.equal(timeMeter({ est_start: day(10), est_end: day(40) }).tone, 'idle');
  assert.match(timeMeter({ est_start: day(10), est_end: day(40) }).text, /začíná za/);

  assert.equal(timeMeter({ est_start: day(-15), est_end: day(15) }).tone, 'ok');
  assert.equal(timeMeter({ est_start: day(-15), est_end: day(15) }).percent, 50);

  assert.equal(timeMeter({ est_start: day(-27), est_end: day(2) }).tone, 'warn');

  const late = timeMeter({ est_start: day(-60), est_end: day(-7) });
  assert.equal(late.tone, 'over');
  assert.match(late.text, /mělo skončit před 7 dny/);

  assert.equal(timeMeter({}).tone, 'muted');
});

test('měrka hodin zčervená při přetečení', () => {
  assert.equal(designMeter({ design: { hours: 40, estHours: 100, overHours: 0 } }).tone, 'ok');
  assert.equal(designMeter({ design: { hours: 95, estHours: 100, overHours: 0 } }).tone, 'warn');

  const over = designMeter({ design: { hours: 110, estHours: 100, overHours: 10 } });
  assert.equal(over.tone, 'over');
  assert.match(over.text, /přeteklo o 10 h/);

  assert.equal(designMeter({ design: { hours: 0, estHours: null, overHours: 0 } }).tone, 'muted');
});

test('měrka PM počítá v penězích', () => {
  assert.equal(pmMeter({ pm: { cost: 10000, budget: 60000, over: 0 } }).tone, 'ok');
  assert.equal(pmMeter({ pm: { cost: 80000, budget: 60000, over: 20000 } }).tone, 'over');
  assert.equal(pmMeter({ pm: { cost: 0, budget: null, over: 0 } }).tone, 'muted');
});
