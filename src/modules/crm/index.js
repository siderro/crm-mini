// CRM — příležitosti (OPP).
//
// Route: #/crm (pipeline: otevřené + zmrazené) a #/crm/archiv (vyhrané + prohrané).
// Řádek je jen ke čtení; kliknutím se pod ním rozbalí panel s poli, notes
// a tlačítkem Uložit změny. Stavová tlačítka se aplikují hned.

import { esc, formatDate, formatMoney, formatMoneyShort, wireKeys, flash } from '../../util.js';
import {
  getOpps, createOpp, updateOpp, setStatus, deleteOpp, CLOSED, STATUS_LABEL,
} from './store.js';

export const crm = {
  id: 'crm',
  label: 'CRM',
  desc: 'Příležitosti (OPP)',
  tileInfo,                // na hubu: hodnota otevřené pipeline
  render(mount, subPath = []) {
    const archive = subPath[0] === 'archiv';

    mount.innerHTML = `
      <div class="crm">
        <div class="page-head">
          <h1>Příležitosti</h1>
          ${archive ? '' : `<button id="opp-add" class="btn btn-primary">+ Nová OPP</button>`}
        </div>
        <nav class="subnav">
          <a href="#/crm" class="subnav-link${archive ? '' : ' active'}">Pipeline</a>
          <a href="#/crm/archiv" class="subnav-link${archive ? ' active' : ''}">Vyhrané / prohrané</a>
        </nav>
        <div id="opp-sum" class="opp-sum"></div>
        <div id="opp-body"><div class="loading">Načítám…</div></div>
      </div>`;

    const addBtn = mount.querySelector('#opp-add');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const opp = await createOpp();
        await load(mount, archive, { openId: opp.id });
      });
    }

    load(mount, archive);
  },
};

/** Dlaždice na hubu: kolik peněz je v otevřených příležitostech. */
async function tileInfo() {
  const open = (await getOpps()).filter((o) => o.status === 'open');
  if (!open.length) return null;

  const total = open.reduce((sum, o) => sum + (Number(o.est_value) || 0), 0);
  return { badge: formatMoneyShort(total) };
}

async function load(mount, archive, { openId = null, flashText = '' } = {}) {
  const body = mount.querySelector('#opp-body');
  const sumEl = mount.querySelector('#opp-sum');

  let opps;
  try {
    opps = await getOpps();
  } catch (err) {
    body.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  const shown = opps.filter((o) => CLOSED.includes(o.status) === archive);
  renderSummary(sumEl, opps, archive);
  renderTable(body, shown, archive, mount);

  if (openId) {
    const row = body.querySelector(`tr[data-id="${openId}"]`);
    if (row) toggleRow(row, mount, archive, flashText);
  }
}

// ── Souhrn nahoře ──

function statBox(label, list) {
  const total = list.reduce((acc, o) => acc + (Number(o.est_value) || 0), 0);
  return `<div class="opp-stat">
    <span class="opp-stat-label">${esc(label)}</span>
    <span class="opp-stat-value">${esc(formatMoney(total))}</span>
    <span class="opp-stat-count">${list.length} ks</span>
  </div>`;
}

function renderSummary(el, opps, archive) {
  const by = (status) => opps.filter((o) => o.status === status);
  el.innerHTML = archive
    ? statBox('Vyhrané', by('won')) + statBox('Prohrané', by('lost'))
    : statBox('Otevřené', by('open')) + statBox('Zmrazené', by('frozen'));
}

// ── Tabulka ──

function renderTable(body, opps, archive, mount) {
  if (!opps.length) {
    body.innerHTML = archive
      ? `<div class="empty-state">Zatím nic uzavřeného.</div>`
      : `<div class="empty-state">Zatím žádné příležitosti. Přidej první přes „+ Nová OPP".</div>`;
    return;
  }

  const rows = opps.map((o) => `
    <tr class="opp-row" data-id="${esc(o.id)}">
      <td class="opp-project">${esc(o.project) || '<span class="muted">(bez názvu)</span>'}</td>
      <td>${esc(o.contact)}</td>
      <td class="opp-value">${esc(formatMoney(o.est_value))}</td>
      <td class="opp-notes">${esc(preview(o.notes))}</td>
      <td class="opp-date">${esc(formatDate(o.created_at))}</td>
      <td class="opp-date">${esc(formatDate(o.updated_at))}</td>
      <td><span class="status status-${esc(o.status)}">${esc(STATUS_LABEL[o.status])}</span></td>
    </tr>`).join('');

  body.innerHTML = `
    <div class="table-scroll"><table class="table opp-table">
      <thead>
        <tr>
          <th>Projekt</th><th>Kontakt</th><th class="opp-value">EST hodnota</th>
          <th>Notes</th><th>Založeno</th><th>Upraveno</th><th>Stav</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  body.querySelector('tbody').addEventListener('click', (e) => {
    const row = e.target.closest('tr.opp-row');
    if (row) toggleRow(row, mount, archive);
  });
}

/** Prvních pár slov z notes do zavřeného řádku. */
function preview(notes) {
  const text = (notes || '').replace(/\s+/g, ' ').trim();
  return text.length > 60 ? text.slice(0, 60) + '…' : text;
}

// ── Rozbalený panel ──

function toggleRow(row, mount, archive, flashText = '') {
  const open = row.nextElementSibling;
  if (open && open.classList.contains('opp-detail')) {
    open.remove();
    row.classList.remove('expanded');
    return;
  }
  // Vždycky jen jeden otevřený panel — jinak se z tabulky stane změť.
  const table = row.closest('table');
  table.querySelectorAll('tr.opp-detail').forEach((tr) => tr.remove());
  table.querySelectorAll('tr.expanded').forEach((tr) => tr.classList.remove('expanded'));

  row.classList.add('expanded');
  row.insertAdjacentHTML('afterend', detailHtml());
  wireDetail(row.nextElementSibling, row, mount, archive, flashText);
}

/** Prázdný panel; hodnoty do něj doplní wireDetail() z dat. */
function detailHtml() {
  return `
    <tr class="opp-detail">
      <td colspan="7">
        <div class="form-wide">
        <div class="opp-form">
          <label>Projekt<input class="input" data-field="project"></label>
          <label>Kontakt<input class="input" data-field="contact"></label>
          <label>EST hodnota<input class="input cell-num" data-field="est_value" type="number" step="1"></label>
        </div>
        <label class="opp-notes-label">Notes
          <textarea class="input opp-notes-input" data-field="notes" rows="5"></textarea>
        </label>
        <div class="form-actions">
          <button class="btn btn-danger" data-act="delete">Smazat</button>
          <span class="form-actions-gap"></span>
          <span class="form-msg"></span>
          <span class="opp-status-actions"></span>
          <button class="btn" data-act="close">Zrušit</button>
          <button class="btn btn-primary" data-act="save">Uložit změny</button>
        </div>
        </div>
      </td>
    </tr>`;
}

/** Stavová tlačítka podle toho, kde OPP zrovna je. */
function statusButtons(status) {
  const btn = (act, label) => `<button class="btn" data-act="${act}">${label}</button>`;
  if (status === 'open') return btn('frozen', 'Zmrazit') + btn('won', 'Vyhráno') + btn('lost', 'Prohráno');
  if (status === 'frozen') return btn('open', 'Rozmrazit') + btn('won', 'Vyhráno') + btn('lost', 'Prohráno');
  return btn('open', 'Vrátit do pipeline');   // won / lost
}

async function wireDetail(detail, row, mount, archive, flashText = '') {
  const id = row.dataset.id;

  // Hodnoty bereme z dat, ne z textu v buňkách — formátovaná čísla a zkrácené
  // notes by se jinak uložily zpátky zkomolené.
  const opp = (await getOpps()).find((o) => o.id === id);
  if (!opp) { detail.remove(); return; }

  detail.querySelector('[data-field="project"]').value = opp.project || '';
  detail.querySelector('[data-field="contact"]').value = opp.contact || '';
  detail.querySelector('[data-field="est_value"]').value = opp.est_value ?? '';
  detail.querySelector('[data-field="notes"]').value = opp.notes || '';
  detail.querySelector('.opp-status-actions').innerHTML = statusButtons(opp.status);
  if (flashText) flash(detail.querySelector('.form-msg'), flashText);

  const ulozit = async () => {
    const value = detail.querySelector('[data-field="est_value"]').value.trim();
    const number = value === '' ? null : Number(value);
    await updateOpp(id, {
      project: detail.querySelector('[data-field="project"]').value,
      contact: detail.querySelector('[data-field="contact"]').value,
      est_value: Number.isNaN(number) ? null : number,
      notes: detail.querySelector('[data-field="notes"]').value,
    });
    await load(mount, archive, { openId: id, flashText: 'Uloženo.' });
  };

  const zavrit = () => toggleRow(row, mount, archive);

  wireKeys(detail, { submit: ulozit, cancel: zavrit });

  detail.addEventListener('click', async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;

    if (act === 'save') { await ulozit(); return; }
    if (act === 'close') { zavrit(); return; }

    if (act === 'delete') {
      if (!confirm('Smazat tuhle příležitost?')) return;
      await deleteOpp(id);
      await load(mount, archive);
      return;
    }

    // Zbytek jsou stavy. Změna stavu může řádek přesunout na druhou záložku —
    // proto se po ní panel neotvírá znovu.
    await setStatus(id, act);
    await load(mount, archive);
  });
}
