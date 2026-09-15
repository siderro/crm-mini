// Výplaty — kolik komu za období zaplatit.
//
// Jen se čte, nic se tu needituje. Sazby se nastavují v Nastavení → Lidé,
// hodiny se berou z výkazů.
//
// Dva způsoby, jak se k částce dojde, a člověk může mít v jednom období oba
// (když mu uprostřed skončil paušál a přešel na hodinovku):
//   · paušál   — platí se za každý měsíc období, bez ohledu na odpracované hodiny
//   · hodinová — platí se odpracované hodiny × sazba platná k datu výkazu
//
// Hodiny se ukazují i u paušálistů — právě proto, že se jim platí stejně.
// Z toho plyne „reálná hodinovka": paušál děleno tím, co se doopravdy odpracovalo.

import { esc, formatMoney, formatMoneyShort } from '../../util.js';
import { listUsers } from '../access/store.js';
import { rateRecordResolver, TYPE_LABEL } from '../rates/store.js';
import { getEntries } from '../timesheet/store.js';
import { RANGES, DEFAULT_RANGE, monthsOf, boundsOf, rangeLabel, fmtHours, payFor } from './logic.js';

export const payroll = {
  id: 'payroll',
  label: 'Výplaty',
  desc: 'Kolik komu za období zaplatit',
  superadminOnly: true,    // mzdové údaje se nerozdávají, ale není to nastavení
  tileInfo,                // na hubu: kolik se tenhle měsíc vyplatí
  render(mount) {
    mount.innerHTML = `
      <div class="pay">
        <div class="page-head"><h1>Výplaty</h1></div>
        <div class="pay-filters">
          ${RANGES.map((r) =>
            `<button class="btn pay-filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
          ).join('')}
        </div>
        <div id="pay-body"><div class="loading">Načítám…</div></div>
      </div>`;

    mount.querySelector('.pay-filters').addEventListener('click', (e) => {
      const range = e.target.dataset.range;
      if (!range) return;
      mount.querySelectorAll('.pay-filter').forEach((b) => b.classList.toggle('active', b === e.target));
      load(mount.querySelector('#pay-body'), range);
    });

    load(mount.querySelector('#pay-body'), DEFAULT_RANGE);
  },
};

/** Dlaždice na hubu: kolik se vyplatí za tenhle měsíc. */
async function tileInfo() {
  const months = monthsOf('month');
  const [from, to] = boundsOf(months);

  const [users, entries] = await Promise.all([listUsers(), getEntries()]);
  const recordOn = await rateRecordResolver();

  const byEmail = {};
  for (const e of entries.filter((x) => x.date >= from && x.date <= to)) {
    (byEmail[e.email] ||= []).push(e);
  }

  const total = users
    .map((u) => payFor(u.email, months, byEmail[u.email] || [], recordOn).total)
    .reduce((sum, t) => sum + t, 0);

  return total ? { badge: formatMoneyShort(Math.round(total)) } : null;
}

// ── Období ──

/**
 * Období jako seznam měsíců. „Tento rok" je od ledna do teď, ne celý rok —
 * ptáš se, kolik jsi letos zaplatil, ne kolik zaplatíš do Silvestra.
 */

/** Hranice období jako 'YYYY-MM-DD', obě včetně. */

// ── Výpočet ──

/**
 * Co komu za období náleží.
 *
 * Paušál se počítá po měsících — pro každý měsíc se vezme sazba platná
 * k jeho poslednímu dni, takže zvýšení uprostřed měsíce platí už pro ten měsíc.
 * Hodinová práce se počítá po výkazech, každý sazbou k datu výkazu.
 * Kdo v období přešel z jednoho na druhé, dostane obojí.
 */

// ── Tabulka ──

async function load(body, rangeId) {
  const months = monthsOf(rangeId);
  const [from, to] = boundsOf(months);

  let users, entries, recordOn;
  try {
    [users, entries] = await Promise.all([listUsers(), getEntries()]);
    recordOn = await rateRecordResolver();
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const byEmail = {};
  for (const e of inRange) (byEmail[e.email] ||= []).push(e);

  const rows = users
    .map((u) => ({ email: u.email, ...payFor(u.email, months, byEmail[u.email] || [], recordOn) }))
    // Koho se to netýká — bez sazby i bez hodin — do výplatnice neplete.
    .filter((r) => r.total > 0 || r.hours > 0)
    .sort((a, b) => b.total - a.total);

  if (!rows.length) {
    body.innerHTML = `<div class="empty-state">Za ${esc(rangeLabel(months))} není co vyplácet.</div>`;
    return;
  }

  const totalPay = rows.reduce((s, r) => s + r.total, 0);
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);

  const typeLabel = (r) => {
    if (!r.types.length) return '<span class="muted">bez sazby</span>';
    return esc(r.types.map((t) => TYPE_LABEL[t]).join(' + '));
  };

  // Reálná hodinovka dává smysl jen u paušálu — u hodinové je to zase ta sazba.
  const realRate = (r) => {
    if (!r.types.includes('monthly')) return '<span class="muted">—</span>';
    if (!r.hours) return '<span class="muted">nic neodtrackováno</span>';
    return `${esc(formatMoney(Math.round(r.total / r.hours)))}/h`;
  };

  body.innerHTML = `
    <div class="pm-summary pay-sum">
      <div class="pm-cell"><span class="pm-cell-label">Období</span><span class="pm-cell-value">${esc(rangeLabel(months))}</span></div>
      <div class="pm-cell"><span class="pm-cell-label">K výplatě</span><span class="pm-cell-value"><strong>${esc(formatMoney(Math.round(totalPay)))}</strong></span></div>
      <div class="pm-cell"><span class="pm-cell-label">Odpracováno</span><span class="pm-cell-value">${esc(fmtHours(totalHours))} h</span></div>
      <div class="pm-cell"><span class="pm-cell-label">Lidí</span><span class="pm-cell-value">${rows.length}</span></div>
    </div>
    <table class="table pay-table">
      <thead>
        <tr>
          <th>Člověk</th><th>Typ</th>
          <th class="pay-num">Hodiny</th><th class="pay-num">K výplatě</th><th class="pay-num">Reálně</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <td class="pay-email">${esc(r.email)}</td>
            <td class="pay-type">${typeLabel(r)}</td>
            <td class="pay-num">${r.hours ? esc(fmtHours(r.hours)) + ' h' : '<span class="muted">—</span>'}</td>
            <td class="pay-num pay-total">${esc(formatMoney(Math.round(r.total)))}${
              r.fixed && r.hourly
                ? `<div class="pay-split muted">paušál ${esc(formatMoney(Math.round(r.fixed)))} + hodiny ${esc(formatMoney(Math.round(r.hourly)))}</div>`
                : ''}</td>
            <td class="pay-num">${realRate(r)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <p class="muted pay-note">
      Paušál se počítá za každý měsíc období, i za ten, který ještě neskončil.
      Hodiny jsou jen to, co je opravdu vykázané.
    </p>`;
}
