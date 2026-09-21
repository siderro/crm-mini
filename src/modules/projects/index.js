// Projekty — hlavní přehled řízení firmy.
//
// Route: #/pm            — běžící projekty, co projekt to řádek
//        #/pm/novy       — založení projektu, rovnou i s lidmi
//        #/pm/<id>       — detail: odhady, ekonomika, tým, výkazy
//
// Uzavřené projekty se vyhodnocují v modulu Ziskovost projektů.
//
// Odhad NENÍ jeden součet. Design se měří v hodinách (tam je zisk a tam se
// nesmí přetéct), PM v penězích (je tak definovaný), SLA je měsíční opakovaný
// příjem mimo cenu projektu. Zisk se ukazuje až u uzavřeného projektu —
// dokud běží, je poctivé jen „spotřebováno X z ceny".

import { esc, formatDate, formatMoney, guard } from '../../util.js';
import { listUsers } from '../access/store.js';
import { rateResolver } from '../rates/store.js';
import { getEntries, KIND_SHORT } from '../timesheet/store.js';
import { projectStats, statsForProjects, snapshotFor } from './economics.js';
import { timeMeter, designMeter, pmMeter, fmtHours } from './meters.js';
import {
  getProjects, getProject, addProject, updateProject, deleteProject,
  closeProject, reopenProject, getProjectMembers, memberCountByProject, setMember,
  isBillable, ROLES, ROLE_LABEL, BILLING, BILLING_LABEL,
} from './store.js';

export const pm = {
  id: 'pm',
  label: 'Projekty',
  desc: 'Řízení projektů',
  levels: true,          // v Přístupech se nastavuje čtení / editace
  tileInfo,              // na hubu: počet běžících a co hoří
  render(mount, subPath = [], ctx = {}) {
    const canEdit = !!ctx.canEdit;
    const page = subPath[0] || null;

    guard(mount, () => {
      if (page === 'novy') return renderCreate(mount, canEdit);
      if (page) return renderDetail(mount, page, canEdit);
      return renderList(mount, canEdit);
    });
  },
};

/** Formátování odhadů — prázdné pole má zůstat prázdné, ne „0". */
const money = (v) => (v == null ? '—' : formatMoney(v));
const date = (v) => (v ? formatDate(v) : '—');
const czk = (v) => formatMoney(Math.round(v || 0));

function subnav(active, canEdit) {
  const link = (id, href, label) =>
    `<a href="${href}" class="subnav-link${id === active ? ' active' : ''}">${label}</a>`;
  return `<nav class="subnav">
    ${link('open', '#/pm', 'Běžící')}
    ${canEdit ? link('new', '#/pm/novy', 'Přidat projekt') : ''}
  </nav>`;
}

function meterCell(meter) {
  const bar = meter.percent === null
    ? ''
    : `<div class="pm-bar"><span style="width: ${meter.percent}%"></span></div>`;
  return `<td class="pm-meter tone-${meter.tone}">
    <div class="pm-meter-text">${esc(meter.text)}</div>${bar}
  </td>`;
}

/**
 * Buňka s cenou: hlavní je EST cena, PM a SLA drobně pod ní.
 * U SLA se ukazuje, kolikrát se za život projektu zaúčtuje — měsíční částka
 * sama o sobě neřekne, kolik z projektu doopravdy přijde.
 */
function priceCell(p, stats) {
  if (!isBillable(p)) {
    return `<td class="pm-price"><span class="status status-frozen">${esc(BILLING_LABEL[p.billing])}</span></td>`;
  }

  const lines = [];
  if (p.est_pm) lines.push(`+ PM ${formatMoney(p.est_pm)}`);

  if (p.est_sla) {
    const { months, total } = stats.sla;
    lines.push(months
      ? `${months}× SLA = ${formatMoney(total)}`
      : `SLA ${formatMoney(p.est_sla)}/měs`);   // bez termínů nevíme, kolikrát
  }

  return `<td class="pm-price">
    <div class="pm-price-main">${p.est_price == null ? '<span class="muted">—</span>' : esc(formatMoney(p.est_price))}</div>
    ${lines.map((l) => `<div class="pm-price-extra muted">${esc(l)}</div>`).join('')}
  </td>`;
}

/** Dlaždice na hubu: kolik projektů běží a co z toho hoří. */
async function tileInfo() {
  const projects = await getProjects();
  if (!projects.length) return null;

  const stats = await statsForProjects(projects);
  const late = projects.filter((p) => timeMeter(p).tone === 'over').length;
  const overHours = projects.filter((p) => stats.get(p.id).design.overHours > 0).length;

  const alarms = [];
  if (late) alarms.push(`${late} po termínu`);
  if (overHours) alarms.push(`${overHours} přes hodiny`);

  return {
    badge: String(projects.length),
    alert: alarms.length ? { text: alarms.join(' · '), tone: 'over' } : null,
  };
}

// ── Výpis běžících ──

async function renderList(mount, canEdit) {
  mount.innerHTML = `
    <div class="pm">
      <div class="page-head">
        <h1>Projekty</h1>
        ${canEdit ? `<a href="#/pm/novy" class="btn btn-primary">+ Nový projekt</a>` : ''}
      </div>
      ${subnav('open', canEdit)}
      <div id="pm-body"><div class="loading">Načítám…</div></div>
    </div>`;

  const body = mount.querySelector('#pm-body');

  let projects;
  try {
    projects = await getProjects();
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!projects.length) {
    body.innerHTML = canEdit
      ? `<div class="empty-state">Žádné běžící projekty. Založ první přes „+ Nový projekt".</div>`
      : `<div class="empty-state">Žádné běžící projekty.</div>`;
    return;
  }

  const [stats, teamSize] = await Promise.all([
    statsForProjects(projects),
    memberCountByProject(),
  ]);

  const rows = projects.map((p) => {
    const s = stats.get(p.id);
    return `
      <tr class="pm-row" data-id="${esc(p.id)}">
        <td class="pm-name">
          ${esc(p.name)}
          <div class="pm-dates muted">${esc(date(p.est_start))} – ${esc(date(p.est_end))}</div>
        </td>
        ${meterCell(timeMeter(p))}
        ${meterCell(designMeter(s))}
        ${meterCell(pmMeter(s))}
        ${priceCell(p, s)}
        <td class="pm-num">${teamSize[p.id] || '<span class="muted">—</span>'}</td>
      </tr>`;
  });

  body.innerHTML = `
    <div class="table-scroll"><table class="table pm-table">
      <thead>
        <tr>
          <th>Projekt</th><th class="pm-meter">Termín</th>
          <th class="pm-meter">Design hodiny</th><th class="pm-meter">Project management</th>
          <th class="pm-price">Cena</th><th class="pm-num">Tým</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;

  body.querySelector('tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr.pm-row');
    if (row) location.hash = `#/pm/${row.dataset.id}`;
  });
}

// ── Formulář (společný pro založení i úpravu) ──

function formFields(p = {}) {
  const v = (key) => esc(p[key] ?? '');
  const billing = p.billing || 'client';
  return `
    <div class="pm-form">
      <label class="pm-field-wide">Název projektu
        <input class="input" data-field="name" value="${v('name')}" placeholder="Název">
      </label>
      <label>Typ projektu
        <select data-field="billing">
          ${BILLING.map((b) => `<option value="${b}"${b === billing ? ' selected' : ''}>${BILLING_LABEL[b]}</option>`).join('')}
        </select>
      </label>
      <label>Plánovaný začátek
        <input class="input" data-field="est_start" type="date" value="${v('est_start')}">
      </label>
      <label>Plánovaný konec
        <input class="input" data-field="est_end" type="date" value="${v('est_end')}">
      </label>
      <label>Odhad hodin (design)
        <input class="input pm-input-num" data-field="est_hours" type="number" min="0" step="1" value="${v('est_hours')}">
      </label>
      <label>Cena projektu (Kč)
        <input class="input pm-input-num" data-field="est_price" type="number" min="0" step="1" value="${v('est_price')}">
      </label>
      <label>Project management (Kč)
        <input class="input pm-input-num" data-field="est_pm" type="number" min="0" step="1" value="${v('est_pm')}">
      </label>
      <label>SLA (Kč / měsíc)
        <input class="input pm-input-num" data-field="est_sla" type="number" min="0" step="1" value="${v('est_sla')}">
      </label>
    </div>`;
}

function readForm(scope) {
  const get = (field) => scope.querySelector(`[data-field="${field}"]`).value;
  return {
    name: get('name'),
    billing: get('billing'),
    est_start: get('est_start'),
    est_end: get('est_end'),
    est_hours: get('est_hours'),
    est_price: get('est_price'),
    est_pm: get('est_pm'),
    est_sla: get('est_sla'),
  };
}

/** Výběr člověka a role. `taken` = e-maily, které už na projektu jsou. */
function personPicker(users, taken) {
  const options = users
    .filter((u) => !taken.includes(u.email))
    .map((u) => `<option value="${esc(u.email)}">${esc(u.email)}</option>`)
    .join('');

  if (!options) return `<div class="muted pm-team-empty">Všichni lidé už na projektu jsou.</div>`;

  return `
    <div class="pm-team-add">
      <select id="pm-person">${options}</select>
      <select id="pm-role">
        ${ROLES.map((r) => `<option value="${r}">${ROLE_LABEL[r]}</option>`).join('')}
      </select>
      <button class="btn" data-act="add-person">Přidat do projektu</button>
      <span class="muted pm-hint">Přidaný člověk může do projektu vykazovat.</span>
    </div>`;
}

function teamListHtml(team, editable) {
  if (!team.length) return `<div class="empty-state">Zatím nikdo. Přidej lidi výběrem pod seznamem — kdo je na projektu, může do něj vykazovat.</div>`;

  return team.map((t) => `
    <div class="pm-member" data-email="${esc(t.email)}">
      <span class="pm-member-email">${esc(t.email)}</span>
      ${editable
        ? `<select data-role-for="${esc(t.email)}">
             ${ROLES.map((r) => `<option value="${r}"${t.role === r ? ' selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}
           </select>`
        : `<span class="status status-frozen">${esc(ROLE_LABEL[t.role] || '—')}</span>`}
      ${editable ? `<button class="btn pm-mini btn-danger" data-act="remove-person" title="Odebrat">×</button>` : ''}
    </div>`).join('');
}

// ── Založení ──

async function renderCreate(mount, canEdit) {
  if (!canEdit) {
    mount.innerHTML = `<div class="empty-state">Zakládat projekty nemůžeš. <a href="#/pm">Zpět na přehled</a></div>`;
    return;
  }

  const users = await listUsers();
  // Lidi sbíráme do paměti — projekt ještě neexistuje, není je kam přiřadit.
  const team = [];

  const draw = () => {
    mount.querySelector('#pm-team').innerHTML =
      teamListHtml(team, true) + personPicker(users, team.map((t) => t.email));
  };

  mount.innerHTML = `
    <div class="pm">
      <div class="page-head"><h1>Nový projekt</h1></div>
      ${subnav('new', true)}
      <div class="form-wide">${formFields()}</div>
      <h2 class="section-head">Tým</h2>
      <div id="pm-team"></div>
      <div class="form-actions form-wide">
        <span class="form-actions-gap"></span>
        <span class="form-msg" id="pm-error"></span>
        <a href="#/pm" class="btn">Zrušit</a>
        <button id="pm-save" class="btn btn-primary">Založit projekt</button>
      </div>
    </div>`;

  draw();

  mount.querySelector('#pm-team').addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (act === 'add-person') {
      const email = mount.querySelector('#pm-person').value;
      const role = mount.querySelector('#pm-role').value;
      if (email) team.push({ email, role });
      draw();
    } else if (act === 'remove-person') {
      const email = e.target.closest('[data-email]').dataset.email;
      team.splice(team.findIndex((t) => t.email === email), 1);
      draw();
    }
  });

  const zalozit = async () => {
    const project = await addProject(readForm(mount));
    if (!project) {
      flash(mount.querySelector('#pm-error'), 'Projekt potřebuje název.', 'error');
      return;
    }
    // Přiřazení z formuláře znamená „může vykazovat".
    for (const t of team) await setMember(project.id, t.email, 'report', t.role);
    location.hash = `#/pm/${project.id}`;
  };

  wireKeys(mount, { submit: zalozit, cancel: () => { location.hash = '#/pm'; } });
  mount.querySelector('#pm-save').addEventListener('click', zalozit);
}

// ── Detail ──

async function renderDetail(mount, id, canEdit) {
  mount.innerHTML = `<div class="pm"><div class="loading">Načítám…</div></div>`;

  const project = await getProject(id);
  if (!project) {
    mount.innerHTML = `<div class="empty-state">Projekt neexistuje. <a href="#/pm">Zpět na přehled</a></div>`;
    return;
  }

  const closed = project.status === 'closed';
  mount.innerHTML = `
    <div class="pm">
      <div class="pm-crumbs"><a href="${closed ? '#/profit' : '#/pm'}">← ${closed ? 'Ziskovost projektů' : 'Přehled projektů'}</a></div>
      <div class="page-head">
        <h1>${esc(project.name)}
          ${closed ? `<span class="status status-won">uzavřený</span>` : ''}
          ${isBillable(project) ? '' : `<span class="status status-frozen">${esc(BILLING_LABEL[project.billing])}</span>`}
        </h1>
        ${canEdit ? `<div class="pm-head-actions">
          ${closed
            ? `<button id="pm-reopen" class="btn">Otevřít znovu</button>`
            : `<button id="pm-edit" class="btn">Upravit</button>
               <button id="pm-close" class="btn">Uzavřít projekt</button>`}
          <button id="pm-delete" class="btn btn-danger">Smazat</button>
        </div>` : ''}
      </div>
      <div id="pm-detail"></div>
      <h2 class="section-head">Ekonomika</h2>
      <div id="pm-econ"><div class="loading">Načítám…</div></div>
      <h2 class="section-head">Tým</h2>
      <div id="pm-team"></div>
      <h2 class="section-head">Výkazy</h2>
      <div id="pm-entries"><div class="loading">Načítám…</div></div>
    </div>`;

  showSummary(mount, project);
  loadEconomics(mount.querySelector('#pm-econ'), project);
  loadTeam(mount, project, canEdit && !closed);
  loadEntries(mount.querySelector('#pm-entries'), project);

  if (!canEdit) return;

  mount.querySelector('#pm-delete').addEventListener('click', async () => {
    if (!confirm('Smazat projekt i přiřazení lidí? Výkazy zůstanou.')) return;
    await deleteProject(project.id);
    location.hash = '#/pm';
  });

  if (closed) {
    mount.querySelector('#pm-reopen').addEventListener('click', async () => {
      if (!confirm('Otevřít znovu? Zmrazená čísla se zahodí a budou se počítat živě.')) return;
      await reopenProject(project.id);
      renderDetail(mount, id, canEdit);
    });
    return;
  }

  mount.querySelector('#pm-edit').addEventListener('click', () => showEdit(mount, project, canEdit));
  mount.querySelector('#pm-close').addEventListener('click', () => showClose(mount, project, canEdit));
}

function showSummary(mount, p) {
  const cell = (label, value) =>
    `<div class="summary-cell"><span class="summary-label">${label}</span><span class="summary-value">${value}</span></div>`;

  mount.querySelector('#pm-detail').innerHTML = `
    <div class="summary">
      ${cell('Typ', esc(BILLING_LABEL[p.billing]))}
      ${cell('Plánovaný začátek', esc(date(p.est_start)))}
      ${cell('Plánovaný konec', esc(date(p.est_end)))}
      ${cell('Odhad hodin', p.est_hours == null ? '—' : esc(fmtHours(p.est_hours)) + ' h')}
      ${cell('Cena projektu', esc(money(p.est_price)))}
      ${cell('Project management', esc(money(p.est_pm)))}
      ${cell('SLA', p.est_sla == null ? '—' : esc(formatMoney(p.est_sla)) + '/měs')}
      ${p.final_price != null ? cell('Fakturováno', `<strong>${esc(formatMoney(p.final_price))}</strong>`) : ''}
    </div>`;
}

/** Ekonomika: dokud projekt běží, mluvíme o spotřebě ceny, ne o zisku. */
async function loadEconomics(el, project) {
  const stats = await projectStats(project);
  const line = (label, value, tone = '') =>
    `<div class="pm-econ-row ${tone}"><span class="pm-econ-label">${label}</span><span class="pm-econ-value">${value}</span></div>`;

  const rows = [];

  if (isBillable(project) && stats.design.estPrice) {
    const over = stats.design.remainingMoney < 0;
    rows.push(line('Design',
      `spotřebováno ${esc(czk(stats.design.cost))} z ${esc(formatMoney(stats.design.estPrice))} · ${
        over ? 'přečerpáno o' : 'zbývá'} ${esc(czk(Math.abs(stats.design.remainingMoney)))}`,
      over ? 'tone-over' : ''));
  } else {
    rows.push(line('Design',
      `${esc(fmtHours(stats.design.hours))} h · stálo nás ${esc(czk(stats.design.cost))}`));
  }

  if (stats.pm.budget) {
    const over = stats.pm.remainingMoney < 0;
    rows.push(line('Project management',
      `spotřebováno ${esc(czk(stats.pm.cost))} z ${esc(formatMoney(stats.pm.budget))} · ${
        over ? 'přečerpáno o' : 'zbývá'} ${esc(czk(Math.abs(stats.pm.remainingMoney)))}`,
      over ? 'tone-over' : ''));
  } else if (stats.pm.hours) {
    rows.push(line('Project management',
      `${esc(fmtHours(stats.pm.hours))} h · stálo nás ${esc(czk(stats.pm.cost))}`));
  }

  if (stats.sla.monthly) {
    rows.push(line('SLA',
      `${esc(formatMoney(stats.sla.monthly))}/měs${
        stats.sla.months ? ` · ${esc(stats.sla.months)} měs. = ${esc(formatMoney(stats.sla.total))}` : ''
      } <span class="muted">(mimo ziskovost)</span>`));
  }

  rows.push(line('Celkem stálo',
    `<strong>${esc(czk(stats.total.cost))}</strong> za ${esc(fmtHours(stats.total.hours))} h`));

  if (stats.margin) {
    const loss = stats.margin.profit < 0;
    rows.push(line('Zisk',
      `<strong>${esc(czk(stats.margin.profit))}</strong>${
        stats.margin.percent == null ? '' : ` · marže ${esc(Math.round(stats.margin.percent))} %`}`,
      loss ? 'tone-over' : ''));
  } else if (isBillable(project)) {
    rows.push(`<div class="pm-econ-note muted">Zisk se spočítá až při uzavření — dokud projekt běží, zbývá práce, která ho sníží.</div>`);
  }

  if (stats.total.missingRate) {
    rows.push(`<div class="pm-econ-note muted">Někdo z týmu nemá nastavenou sazbu — jeho hodiny se do nákladu nepočítají.</div>`);
  }

  el.innerHTML = `<div class="pm-econ">${rows.join('')}</div>`;
}

function showEdit(mount, project, canEdit) {
  const el = mount.querySelector('#pm-detail');
  el.innerHTML = `
    <div class="form-wide">
      ${formFields(project)}
      <div class="form-actions">
        <span class="form-actions-gap"></span>
        <span class="form-msg" id="pm-error"></span>
        <button id="pm-cancel" class="btn">Zrušit</button>
        <button id="pm-save" class="btn btn-primary">Uložit změny</button>
      </div>
    </div>`;

  const zrusit = () => showSummary(mount, project);

  const ulozit = async () => {
    const updated = await updateProject(project.id, readForm(el));
    if (!updated) {
      flash(el.querySelector('#pm-error'), 'Projekt potřebuje název.', 'error');
      return;
    }
    renderDetail(mount, project.id, canEdit);
  };

  wireKeys(el, { submit: ulozit, cancel: zrusit });
  el.querySelector('#pm-cancel').addEventListener('click', zrusit);
  el.querySelector('#pm-save').addEventListener('click', ulozit);
}

/** Uzavření se ptá na skutečně fakturovanou cenu a zmrazí čísla. */
function showClose(mount, project, canEdit) {
  const el = mount.querySelector('#pm-detail');
  el.innerHTML = `
    <div class="pm-close-form">
      <div class="pm-form">
        <label>Skutečně fakturovaná cena (Kč)
          <input class="input pm-input-num" id="pm-final-price" type="number" min="0" step="1" value="${esc(project.est_price ?? '')}">
        </label>
      </div>
      <p class="muted pm-hint">
        Uzavřením se čísla zmrazí — pozdější změna sazeb je už nepřepíše.
        Do uzavřeného projektu se nedá vykazovat.
      </p>
      <div class="form-actions">
        <span class="form-actions-gap"></span>
        <button id="pm-close-cancel" class="btn">Zrušit</button>
        <button id="pm-close-confirm" class="btn btn-primary">Uzavřít projekt</button>
      </div>
    </div>`;

  const zrusit = () => showSummary(mount, project);

  // Uzavření je nevratné — zmrazí čísla a zakáže vykazování. Proto se ptá,
  // i když je výstraha vidět nad tlačítkem: text se přehlédne, dialog ne.
  const uzavrit = async () => {
    const finalPrice = el.querySelector('#pm-final-price').value;
    if (!confirm('Uzavřít projekt? Čísla se zmrazí a do projektu už nepůjde vykazovat.')) return;
    const stats = await snapshotFor(project, finalPrice);
    await closeProject(project.id, { finalPrice, stats });
    renderDetail(mount, project.id, canEdit);
  };

  wireKeys(el, { submit: uzavrit, cancel: zrusit });
  el.querySelector('#pm-close-cancel').addEventListener('click', zrusit);
  el.querySelector('#pm-close-confirm').addEventListener('click', uzavrit);
}

async function loadTeam(mount, project, canEdit) {
  const el = mount.querySelector('#pm-team');
  const [team, users] = await Promise.all([getProjectMembers(project.id), listUsers()]);

  el.innerHTML = teamListHtml(team, canEdit)
    + (canEdit ? personPicker(users, team.map((t) => t.email)) : '');

  if (!canEdit) return;

  el.onclick = async (e) => {
    const act = e.target.dataset.act;
    if (act === 'add-person') {
      const email = el.querySelector('#pm-person').value;
      const role = el.querySelector('#pm-role').value;
      if (email) await setMember(project.id, email, 'report', role);
    } else if (act === 'remove-person') {
      await setMember(project.id, e.target.closest('[data-email]').dataset.email, null);
    } else {
      return;
    }
    loadTeam(mount, project, canEdit);
  };

  // Změna role nechává úroveň být — člověk zůstává vykazující.
  el.onchange = async (e) => {
    const email = e.target.dataset.roleFor;
    if (!email) return;
    await setMember(project.id, email, 'report', e.target.value);
  };
}

async function loadEntries(el, project) {
  const entries = await getEntries({ projectId: project.id });

  if (!entries.length) {
    el.innerHTML = `<div class="empty-state">Na tenhle projekt zatím nikdo nevykázal. Dokud nejsou hodiny, nejde spočítat spotřeba ani zisk.</div>`;
    return;
  }

  // Sazba k datu výkazu, ne dnešní — historie se zpětně nepřepisuje.
  const rateOn = await rateResolver(entries.map((e) => e.email));

  const rows = [];
  for (const e of entries) {
    const rate = rateOn(e.email, e.date);
    const cost = rate == null ? null : rate * e.hours;

    rows.push(`
      <tr>
        <td class="pm-date">${esc(formatDate(e.date))}</td>
        <td>${esc(e.email)}</td>
        <td class="pm-kind">${esc(KIND_SHORT[e.kind])}</td>
        <td class="pm-num">${esc(fmtHours(e.hours))} h</td>
        <td class="pm-num">${rate == null ? '<span class="muted">bez sazby</span>' : esc(czk(rate)) + '/h'}</td>
        <td class="pm-num">${cost == null ? '<span class="muted">—</span>' : esc(czk(cost))}</td>
        <td class="pm-note">${esc(e.note || '')}</td>
      </tr>`);
  }

  el.innerHTML = `
    <div class="table-scroll"><table class="table pm-entries-table">
      <thead>
        <tr>
          <th>Datum</th><th>Kdo</th><th>Typ</th><th class="pm-num">Hodiny</th>
          <th class="pm-num">Sazba</th><th class="pm-num">Náklad</th><th>Poznámka</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;
}
