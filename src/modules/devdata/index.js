// Testovací data — generátor a mazání.
//
// Je to nástroj na testování, ne součást provozu. Proto je v Nastavení,
// vidí ho jen superadmin a všechno, co vytvoří, nese příznak `is_dummy` —
// mazání se tak nemůže dotknout opravdových lidí ani jejich práce.

import { esc, guard } from '../../util.js';
import { stats, generate, wipe } from './store.js';

export const devdata = {
  id: 'dev-data',
  label: 'Testovací data',
  desc: 'Vygenerovat nebo smazat dummy data',
  settings: true,
  superadminOnly: true,
  render(mount) {
    mount.innerHTML = `
      <div class="dev">
        <div class="page-head"><h1>Testovací data</h1></div>
        <p class="muted dev-lead">
          Vygeneruje pět vymyšlených lidí, deset projektů, sazby, roční historii
          výkazů, příležitosti, wiki stránky a úkoly. Vymyšlení lidé mají e-mail
          s předponou <code>test.</code>, ať je v seznamech poznáš.
        </p>
        <div id="dev-body"><div class="loading">Načítám…</div></div>
      </div>`;

    const body = mount.querySelector('#dev-body');
    guard(body, () => load(body));
  },
};

const LABELS = {
  lide: 'lidí',
  projekty: 'projektů',
  sazby: 'sazeb',
  vykazy: 'výkazů',
  prilezitosti: 'příležitostí',
  stranky: 'wiki stránek',
  ukoly: 'úkolů',
  prirazeni: 'přiřazení',
};

/** Z počtů od databáze udělá čitelný výčet. */
function summary(counts) {
  const parts = Object.entries(counts)
    .filter(([key, n]) => LABELS[key] && n > 0)
    .map(([key, n]) => `${n} ${LABELS[key]}`);
  return parts.length ? parts.join(' · ') : 'nic';
}

async function load(body, message = '') {
  const counts = await stats();
  const total = Object.values(counts).reduce((sum, n) => sum + Number(n), 0);

  body.innerHTML = `
    ${message}
    <div class="pm-summary dev-sum">
      <div class="pm-cell">
        <span class="pm-cell-label">V systému je</span>
        <span class="pm-cell-value">${total ? esc(summary(counts)) : 'žádná testovací data'}</span>
      </div>
    </div>
    <div class="dev-actions">
      <button id="dev-gen" class="btn btn-primary">
        ${total ? 'Vygenerovat znovu' : 'Vygenerovat testovací data'}
      </button>
      ${total ? `<button id="dev-wipe" class="btn btn-danger">Smazat testovací data</button>` : ''}
    </div>
    ${total ? `<p class="muted dev-note">
      Generování začíná vždycky z čista — stávající testovací data nejdřív smaže,
      ať se nenaskládají na sebe.
    </p>` : ''}
    <h2 class="dev-head">Čeho se mazání nedotkne</h2>
    <p class="muted dev-note">
      Opravdových lidí ani jejich výkazů, sazeb, projektů, příležitostí, wiki
      a úkolů. Maže se výhradně to, co nese příznak <code>is_dummy</code>, takže
      na tom nezáleží, jak se kdo jmenuje.
    </p>`;

  body.querySelector('#dev-gen').addEventListener('click', async () => {
    await run(body, 'Generuju… u roční historie výkazů to chvíli trvá.', async () => {
      const result = await generate();
      return `<div class="dev-msg dev-msg-ok">Vygenerováno: ${esc(summary(result))}.</div>`;
    });
  });

  const wipeBtn = body.querySelector('#dev-wipe');
  if (wipeBtn) {
    wipeBtn.addEventListener('click', async () => {
      if (!confirm('Smazat všechna testovací data? Opravdových dat se to nedotkne.')) return;
      await run(body, 'Mažu…', async () => {
        const result = await wipe();
        return `<div class="dev-msg">Smazáno: ${esc(summary(result))}.</div>`;
      });
    });
  }
}

/** Průběh se musí ozvat — generování roční historie není okamžité. */
async function run(body, progress, action) {
  body.innerHTML = `<div class="loading">${esc(progress)}</div>`;
  try {
    const message = await action();
    await load(body, message);
  } catch (err) {
    await load(body, `<div class="error">Nepovedlo se: ${esc(err.message)}</div>`);
  }
}
