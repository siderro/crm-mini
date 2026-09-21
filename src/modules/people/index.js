// Lidé — jedno místo pro všechno, co se váže na člověka.
//
// Sloučené z původních modulů „Přístupy" a „Hodinové sazby": obojí byl seznam
// lidí, jen se v něm nastavovalo něco jiného. Teď je řádek na člověka a po
// rozkliknutí jsou vedle sebe jeho moduly a jeho sazba.
//
// Vidí ho jen super admin (gating je v src/app.js přes canAccess()) — rozdávat
// přístupy do modulů je z podstaty jeho věc.
//
// Data zůstávají ve dvou storech (access/store.js a rates/store.js), protože
// jsou to dvě různé tabulky. Slučuje se obrazovka, ne data.

import { esc, formatDate, formatMoney, guard, flash } from '../../util.js';
import { MODULES } from '../registry.js';

/** Moduly, které jde někomu zapnout — ty jen pro superadmina mezi ně nepatří. */
const GRANTABLE = MODULES.filter((m) => !m.superadminOnly);
import { SUPERADMIN_EMAILS } from '../../config.js';
import {
  listUsers, setUserModule, setUserRole,
  ROLES, ROLE_LABEL, ROLE_DESC, matchesRole,
} from '../access/store.js';
import {
  getRates, rateInfoAt, addRate, updateRate, deleteRate, hourlyOf,
  today, TYPES, TYPE_LABEL, DEFAULT_MONTHLY_HOURS,
} from '../rates/store.js';

export const people = {
  id: 'people',
  label: 'Lidé',
  desc: 'Přístupy do modulů a hodinové sazby',
  settings: true,        // nepatří do hlavní navigace, žije v Nastavení
  render(mount) {
    mount.innerHTML = `
      <div class="people">
        <div class="page-head"><h1>Lidé</h1></div>
        <p class="lead">
          Kdo se přihlásil, do kterých modulů smí a kolik nás stojí za hodinu.
        </p>
        <div id="people-body"><div class="loading">Načítám…</div></div>
      </div>`;

    const body = mount.querySelector('#people-body');
    guard(body, () => load(body));
  },
};

const SUPERADMINS = SUPERADMIN_EMAILS.map((e) => e.trim().toLowerCase());

function isSuperadmin(email) {
  return SUPERADMINS.includes((email || '').trim().toLowerCase());
}

/** Hodinovka do textu; paušál dostane ≈, protože je odvozený. */
function hourlyText(hourly, type) {
  if (hourly == null) return '<span class="muted">nenastaveno</span>';
  const value = `${esc(formatMoney(Math.round(hourly)))}/h`;
  return type === 'monthly' ? `≈ ${value}` : value;
}

// ── Přehledová tabulka ──

async function load(body) {
  let users;
  try {
    users = await listUsers();
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!users.length) {
    body.innerHTML = `<div class="empty-state">Kromě tebe se zatím nikdo nepřihlásil. Člověk se v seznamu objeví sám, jakmile se poprvé přihlásí přes Google.</div>`;
    return;
  }

  const day = today();
  const rows = [];

  for (const u of users) {
    const superadmin = isSuperadmin(u.email);
    const granted = u.modules || {};
    const count = superadmin ? GRANTABLE.length : Object.keys(granted).length;
    const info = await rateInfoAt(u.email, day);

    const badge = superadmin
      ? `<span class="status status-open">superadmin</span>`
      : (count ? roleBadge(u) : `<span class="status status-frozen">čeká</span>`);

    rows.push(`
      <tr class="people-row" data-email="${esc(u.email)}">
        <td class="people-email">${esc(u.email)} ${badge}</td>
        <td class="people-date">${esc(formatDate(u.first_login))}</td>
        <td class="people-date">${esc(formatDate(u.last_login))}</td>
        <td class="people-num">${count} z ${GRANTABLE.length}</td>
        <td class="people-rate">${hourlyText(info?.hourly ?? null, info?.type)}</td>
      </tr>`);
  }

  body.innerHTML = `
    <div class="table-scroll"><table class="table people-table">
      <thead>
        <tr>
          <th>Člověk</th><th>Poprvé</th><th>Naposledy</th>
          <th class="people-num">Modulů</th><th class="people-rate">Náklad dnes</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;

  body.querySelector('tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr.people-row');
    if (row) toggleRow(row, body);
  });
}

function toggleRow(row, body) {
  const next = row.nextElementSibling;
  if (next && next.classList.contains('people-detail')) {
    next.remove();
    row.classList.remove('expanded');
    return;
  }
  // Vždycky jen jeden otevřený člověk.
  const table = row.closest('table');
  table.querySelectorAll('tr.people-detail').forEach((tr) => tr.remove());
  table.querySelectorAll('tr.expanded').forEach((tr) => tr.classList.remove('expanded'));

  row.classList.add('expanded');
  row.insertAdjacentHTML('afterend', `
    <tr class="people-detail"><td colspan="5">
      <div class="people-panels">
        <div class="people-panel">
          <h2 class="section-head">Role</h2>
          <div class="people-role"></div>
        </div>
        <div class="people-panel">
          <h2 class="section-head">Moduly</h2>
          <div class="people-modules"></div>
        </div>
        <div class="people-panel">
          <h2 class="section-head">Hodinová sazba</h2>
          <div class="people-rates"><div class="loading">Načítám…</div></div>
        </div>
      </div>
    </td></tr>`);

  const detail = row.nextElementSibling;
  const email = row.dataset.email;
  renderRole(detail.querySelector('.people-role'), row, body);
  renderModules(detail.querySelector('.people-modules'), row, body);
  loadRates(detail.querySelector('.people-rates'), email, body);
}

// ── Panel: role ──
//
// Role je předloha, ne živé pravidlo pro moduly: výběr zapíše mapu modulů
// a od té chvíle jde doladit jednotlivě. Proto se u upravené mapy píše
// „(upraveno)" a nabízí srovnání — jinak by nebylo poznat, že se rozešla
// s předlohou.
//
// Co role rozhoduje živě, je hodnost: které řádky uvnitř modulu člověk uvidí.
// Tohle hlídá RLS, ne tenhle výběr.

/** Štítek role do zavřeného řádku. */
function roleBadge(user) {
  if (!user.role) return '<span class="status status-frozen">bez role</span>';
  const drift = matchesRole(user.role, user.modules) ? '' : ' <span class="muted">(upraveno)</span>';
  return `<span class="status status-won">${esc(ROLE_LABEL[user.role])}</span>${drift}`;
}

async function renderRole(el, row, body) {
  const email = row.dataset.email;

  if (isSuperadmin(email)) {
    el.innerHTML = `<p class="note">
      Super admin. Plyne z konfigurace, ne z dat — proto se nedá nastavit ani odebrat.
    </p>`;
    return;
  }

  const user = (await listUsers()).find((u) => u.email === email);
  const role = user?.role || '';
  const drift = role && !matchesRole(role, user.modules || {});

  el.innerHTML = `
    <label class="people-role-pick">
      <span class="people-module-name">Role</span>
      <select data-role>
        <option value=""${role ? '' : ' selected'}>—</option>
        ${ROLES.map((r) =>
          `<option value="${esc(r)}"${r === role ? ' selected' : ''}>${esc(ROLE_LABEL[r])}</option>`
        ).join('')}
      </select>
    </label>
    <p class="note">${esc(role ? ROLE_DESC[role] : 'Bez role zůstane člověk v čekárně.')}</p>
    ${drift ? `
      <p class="note">
        Moduly se od předlohy role liší.
        <button class="btn people-role-reset" data-reset>Srovnat s rolí</button>
      </p>` : ''}`;

  const maModuly = Object.keys(user?.modules || {}).length > 0;

  el.onchange = async (e) => {
    if (!('role' in e.target.dataset)) return;
    // Nastavení role přepíše mapu modulů předlohou — to je celý smysl předlohy.
    // Ptát se je potřeba vždycky, když je co přepsat, ne až když má člověk roli:
    // ručně rozdané moduly bez role by se jinak ztratily beze slova.
    if (maModuly && !confirm('Nastavením role se moduly přepíšou její předlohou. Pokračovat?')) {
      await load(body);
      reopen(body, email);
      return;
    }
    await setUserRole(email, e.target.value || null);
    await load(body);
    reopen(body, email);
  };

  el.onclick = async (e) => {
    if (!('reset' in e.target.dataset)) return;
    await setUserRole(email, role);
    await load(body);
    reopen(body, email);
  };
}

// ── Panel: moduly ──

async function renderModules(el, row, body) {
  const email = row.dataset.email;
  const superadmin = isSuperadmin(email);
  const user = (await listUsers()).find((u) => u.email === email);
  const granted = user?.modules || {};

  // Super admin má všechno vždycky a jeho práva neplynou z dat — proto zamčeno.
  const rows = GRANTABLE.map((m) => {
    const level = superadmin ? 'edit' : (granted[m.id] || '');
    const dis = superadmin ? ' disabled' : '';

    const control = m.levels
      ? `<select data-module="${esc(m.id)}"${dis}>
           <option value=""${level === '' ? ' selected' : ''}>—</option>
           <option value="read"${level === 'read' ? ' selected' : ''}>čtení</option>
           <option value="edit"${level === 'edit' ? ' selected' : ''}>editace</option>
         </select>`
      : `<input type="checkbox" data-module="${esc(m.id)}"${level ? ' checked' : ''}${dis}>`;

    return `<label class="people-module">
      <span class="people-module-name">${esc(m.label)}</span>${control}
    </label>`;
  }).join('');

  el.innerHTML = superadmin
    ? `${rows}<p class="note">Super admin má všechno vždycky, práva plynou z konfigurace.</p>`
    : rows;

  if (superadmin) return;

  // Přepnutí se ukládá hned, bez tlačítka — stav prvku je zároveň potvrzení.
  el.onchange = async (e) => {
    const moduleId = e.target.dataset.module;
    if (!moduleId) return;

    const level = e.target.tagName === 'SELECT'
      ? (e.target.value || null)
      : (e.target.checked ? 'edit' : null);

    await setUserModule(email, moduleId, level);
    await load(body);
    reopen(body, email);
  };
}

// ── Panel: sazba ──

function typeSelect(attrs, selected) {
  return `<select ${attrs}>
    ${TYPES.map((t) => `<option value="${t}"${t === selected ? ' selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}
  </select>`;
}

/** Pole podle typu — hodinová má jednu částku, paušál dvě. */
function amountFields(r) {
  return r.type === 'monthly'
    ? `<input class="input rate-input" data-field="monthly_amount" type="number" min="0" step="1" value="${esc(r.monthly_amount ?? '')}">
       <span class="rate-unit">Kč/měs za</span>
       <input class="input rate-input rate-input-hours" data-field="monthly_hours" type="number" min="1" step="1" value="${esc(r.monthly_hours ?? '')}">
       <span class="rate-unit">h/měs</span>`
    : `<input class="input rate-input" data-field="rate" type="number" min="0" step="1" value="${esc(r.rate ?? '')}">
       <span class="rate-unit">Kč/h</span>`;
}

/** Pole pro novou sazbu podle zvoleného typu. */
function newFields(type) {
  return type === 'monthly'
    ? `<input class="input rate-input" id="rate-new-amount" type="number" min="0" step="1" placeholder="0">
       <span class="rate-unit">Kč/měs za</span>
       <input class="input rate-input rate-input-hours" id="rate-new-hours" type="number" min="1" step="1" value="${DEFAULT_MONTHLY_HOURS}">
       <span class="rate-unit">h/měs</span>`
    : `<input class="input rate-input" id="rate-new-rate" type="number" min="0" step="1" placeholder="0">
       <span class="rate-unit">Kč/h</span>`;
}

async function loadRates(el, email, body) {
  const list = await getRates(email);
  const day = today();

  const rows = list.map((r) => {
    const future = (r.valid_from || '') > day;
    const hourly = hourlyOf(r);
    return `
      <div class="rate-version" data-id="${esc(r.id)}">
        ${typeSelect(`data-field="type"`, r.type)}
        <span class="rate-amounts">${amountFields(r)}</span>
        <span class="rate-from-label">od</span>
        <input class="input rate-input" data-field="valid_from" type="date" value="${esc(r.valid_from)}">
        ${r.type === 'monthly'
          ? `<span class="rate-derived" title="Odvozeno z paušálu — je to odhad">≈ ${esc(formatMoney(Math.round(hourly ?? 0)))}/h</span>`
          : ''}
        ${future ? `<span class="status status-frozen">budoucí</span>` : ''}
        <button class="btn rate-save" data-act="save" title="Uložit změny">Uložit</button>
        <button class="btn btn-danger rate-del" data-act="delete" title="Smazat verzi">×</button>
      </div>`;
  }).join('');

  el.innerHTML = (list.length ? rows : `<div class="empty-state">
      Zatím žádná sazba. Bez ní se náklad jeho práce nikde nespočítá — projekty
      u něj budou hlásit „bez sazby".
    </div>`) + `
    <div class="rate-add">
      ${typeSelect(`id="rate-new-type"`, 'hourly')}
      <span id="rate-new-fields">${newFields('hourly')}</span>
      <span class="rate-from-label">od</span>
      <input class="input rate-input" id="rate-new-from" type="date" value="${esc(day)}">
      <button class="btn btn-primary" data-act="add">Přidat sazbu</button>
    </div>
    <div class="form-msg"></div>`;

  const typePicker = el.querySelector('#rate-new-type');
  const msg = el.querySelector('.form-msg');

  typePicker.addEventListener('change', () => {
    el.querySelector('#rate-new-fields').innerHTML = newFields(typePicker.value);
  });

  el.onclick = async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'add') {
      const value = (field) => el.querySelector(`#rate-new-${field}`)?.value ?? '';
      const saved = await addRate(email, {
        type: typePicker.value,
        rate: value('rate'),
        monthly_amount: value('amount'),
        monthly_hours: value('hours'),
        valid_from: el.querySelector('#rate-new-from').value,
      });
      if (!saved) {
        // Tiché nic bylo nejhorší chování v aplikaci — klik, a žádná reakce.
        flash(msg, typePicker.value === 'monthly'
          ? 'Paušál potřebuje částku i počet hodin za měsíc.'
          : 'Vyplň hodinovou sazbu.', 'error');
        return;
      }
    } else if (act === 'save') {
      if (!await ulozitVerzi(e.target.closest('.rate-version'))) {
        flash(msg, 'Sazba potřebuje částku — u paušálu i počet hodin za měsíc.', 'error');
        return;
      }
    } else {
      if (!confirm('Smazat tuhle verzi sazby?')) return;
      await deleteRate(e.target.closest('.rate-version').dataset.id);
    }
    // „Náklad dnes" v tabulce nahoře se musí přepočítat.
    await load(body);
    reopen(body, email);
  };

  // Přepnutí typu jen přestaví pole; uloží se až tlačítkem.
  el.onchange = async (e) => {
    if (e.target.dataset.field !== 'type') return;
    const row = e.target.closest('.rate-version');
    const record = (await getRates(email)).find((r) => r.id === row.dataset.id);
    row.querySelector('.rate-amounts').innerHTML =
      amountFields({ ...record, type: e.target.value });
  };
}

/**
 * Uloží jednu verzi sazby. Vrací false, když formulář nedává smysl.
 *
 * Dřív se ukládalo při opuštění pole — jenže verze má až čtyři pole (typ,
 * částka, hodiny, platnost od), takže to porušovalo pravidlo ze STANDARDS.md.
 * A návratová hodnota se nekontrolovala: neplatná změna se po překreslení
 * tiše vrátila zpátky a vypadalo to, jako by se nic nestalo.
 */
async function ulozitVerzi(row) {
  const get = (field) => row.querySelector(`[data-field="${field}"]`)?.value ?? '';
  const type = get('type');

  const patch = {
    type,
    rate: get('rate'),
    monthly_amount: get('monthly_amount'),
    monthly_hours: get('monthly_hours') || (type === 'monthly' ? DEFAULT_MONTHLY_HOURS : ''),
    valid_from: get('valid_from'),
  };

  return !!(await updateRate(row.dataset.id, patch));
}

/** Po překreslení tabulky vrátí otevřeného člověka tam, kde byl. */
function reopen(body, email) {
  const row = body.querySelector(`tr.people-row[data-email="${CSS.escape(email)}"]`);
  if (row) toggleRow(row, body);
}
