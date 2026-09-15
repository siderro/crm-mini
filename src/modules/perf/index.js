// Výkon — kolik hodin máme a kolik jich doopravdy odvedeme.
//
// Karty po měsících, jako v Příjmech, ale místo peněz hodiny.
//
// Tři čísla, která to celé nesou:
//   natrackováno — co je opravdu vykázané
//   kapacita     — kolik hodin měsíčně máme zaplacených u lidí na paušálu
//   klientské    — kolik z natrackovaného šlo na projekty, které vydělávají
//
// Kapacitu známe jen u paušálů — u nich je počet hodin za měsíc součástí
// dohody. Hodinoví lidé žádnou slíbenou kapacitu nemají, takže se počítají
// do odvedené práce, ale ne do toho, co „máme".

import { esc } from '../../util.js';
import { listUsers } from '../access/store.js';
import { rateRecordResolver } from '../rates/store.js';
import { getEntries } from '../timesheet/store.js';
import { getProjects, isBillable } from '../projects/store.js';
import { RANGES, DEFAULT_RANGE, MONTH_NAMES, fmtHours, pct, shortName, monthsFor, monthKey, lastDayIso } from './logic.js';

export const perf = {
  id: 'perf',
  label: 'Výkon',
  desc: 'Kolik hodin máme a kolik děláme',
  superadminOnly: true,
  render(mount) {
    mount.innerHTML = `
      <div class="perf">
        <div class="page-head"><h1>Výkon</h1></div>
        <p class="muted perf-lead">
          Kapacita je počet hodin za měsíc slíbený lidem na paušálu. Hodinoví lidé
          do kapacity nevstupují — odvedená práce se u nich počítá, slíbená ne.
        </p>
        <div class="perf-filters">
          ${RANGES.map((r) =>
            `<button class="btn perf-filter${r.id === DEFAULT_RANGE ? ' active' : ''}" data-range="${r.id}">${r.label}</button>`
          ).join('')}
        </div>
        <div id="perf-body"><div class="loading">Načítám…</div></div>
      </div>`;

    mount.querySelector('.perf-filters').addEventListener('click', (e) => {
      const range = e.target.dataset.range;
      if (!range) return;
      mount.querySelectorAll('.perf-filter').forEach((b) => b.classList.toggle('active', b === e.target));
      load(mount.querySelector('#perf-body'), range);
    });

    load(mount.querySelector('#perf-body'), DEFAULT_RANGE);
  },
};

/**
 * Měsíce, které přehled ukazuje. Kouká se zpátky — je to odvedená práce,
 * ne plán. „Tento rok" proto končí aktuálním měsícem.
 */

async function load(body, rangeId) {
  let users, entries, projects, recordOn;
  try {
    [users, entries, projects] = await Promise.all([
      listUsers(), getEntries(), getProjects({ includeClosed: true }),
    ]);
    recordOn = await rateRecordResolver();
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  const billable = Object.fromEntries(projects.map((p) => [p.id, isBillable(p)]));
  const months = monthsFor(rangeId);

  const cards = months.map((date) => {
    const key = monthKey(date);
    const monthEnd = lastDayIso(date);

    // Kapacita: kdo měl na konci toho měsíce paušál, slíbil svoje hodiny.
    let capacity = 0;
    for (const u of users) {
      const rate = recordOn(u.email, monthEnd);
      if (rate?.type === 'monthly') capacity += Number(rate.monthly_hours) || 0;
    }

    const mine = entries.filter((e) => e.date.slice(0, 7) === key);
    const perPerson = {};
    let tracked = 0;
    let client = 0;

    for (const e of mine) {
      tracked += e.hours;
      // Projekt, který mezitím zmizel, bereme jako klientský — mazat se dají
      // jen projekty bez výkazů, takže tohle je jen pojistka.
      if (billable[e.project_id] !== false) client += e.hours;
      perPerson[e.email] = (perPerson[e.email] || 0) + e.hours;
    }

    return { date, capacity, tracked, client, internal: tracked - client, perPerson };
  });

  const total = cards.reduce((acc, c) => ({
    capacity: acc.capacity + c.capacity,
    tracked: acc.tracked + c.tracked,
    client: acc.client + c.client,
    internal: acc.internal + c.internal,
  }), { capacity: 0, tracked: 0, client: 0, internal: 0 });

  const cell = (label, value, tone = '') =>
    `<div class="pm-cell"><span class="pm-cell-label">${label}</span><span class="pm-cell-value ${tone}">${value}</span></div>`;

  const use = pct(total.tracked, total.capacity);
  const bill = pct(total.client, total.tracked);

  body.innerHTML = `
    <div class="pm-summary perf-sum">
      ${cell('Natrackováno', `<strong>${esc(fmtHours(total.tracked))} h</strong>`)}
      ${cell('Kapacita paušálů', total.capacity ? `${esc(fmtHours(total.capacity))} h` : '—')}
      ${cell('Využití', use == null ? '—' : `${use} %`, use != null && use < 70 ? 'tone-over' : '')}
      ${cell('Klientské', total.tracked ? `${esc(fmtHours(total.client))} h · ${bill} %` : '—')}
      ${cell('Interní a pro bono', total.internal ? `${esc(fmtHours(total.internal))} h` : '—')}
    </div>
    <div class="perf-months">${cards.map(card).join('')}</div>`;
}

function card(c) {
  const use = pct(c.tracked, c.capacity);
  const bill = pct(c.client, c.tracked);

  const people = Object.entries(c.perPerson)
    .sort((a, b) => b[1] - a[1])
    .map(([email, hours]) => `
      <div class="perf-person">
        <span class="perf-person-name">${esc(shortName(email))}</span>
        <span class="perf-person-hours">${esc(fmtHours(hours))} h</span>
      </div>`).join('');

  return `
    <div class="perf-card${c.tracked ? '' : ' perf-card-empty'}">
      <div class="perf-card-head">
        <span class="perf-card-month">${MONTH_NAMES[c.date.getMonth()]} ${c.date.getFullYear()}</span>
        <span class="perf-card-total">${c.tracked ? esc(fmtHours(c.tracked)) + ' h' : '—'}</span>
      </div>
      ${c.capacity
        ? `<div class="perf-card-use${use != null && use < 70 ? ' tone-over' : ''}">
             z kapacity ${esc(fmtHours(c.capacity))} h${use == null ? '' : ` · ${use} %`}
           </div>`
        : `<div class="perf-card-use muted">bez kapacity paušálů</div>`}
      ${people || '<div class="perf-card-none muted">nic nevykázáno</div>'}
      ${c.tracked ? `
        <div class="perf-card-split">
          <span>klientské ${esc(fmtHours(c.client))} h</span>
          <span>${bill} %</span>
        </div>
        ${c.internal ? `<div class="perf-card-internal muted">interní a pro bono ${esc(fmtHours(c.internal))} h</div>` : ''}
      ` : ''}
    </div>`;
}
