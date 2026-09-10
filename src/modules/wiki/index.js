// ŠG wiki — vlevo seznam stránek, vpravo obsah vybrané stránky.
// Route: #/wiki (jen seznam) a #/wiki/<id> (seznam + obsah).
//
// Práva chodí z app.js jako `ctx.canEdit`. Bez nich je všechno jen ke čtení:
// žádné inputy, žádná tlačítka. Text stránky je markdown (viz markdown.js).

import { esc, formatDate } from '../../util.js';
import { renderMarkdown } from './markdown.js';
import { getPages, getPage, createPage, updatePage, deletePage } from './store.js';

export const wiki = {
  id: 'wiki',
  label: 'ŠG wiki',
  desc: 'Interní znalostní báze',
  levels: true,          // v Přístupech se nastavuje čtení / editace
  render(mount, subPath = [], ctx = {}) {
    const activeId = subPath[0] || null;

    mount.innerHTML = `
      <div class="wiki">
        <div class="page-head">
          <h1>ŠG wiki</h1>
          ${ctx.canEdit ? `<button id="wiki-add" class="btn btn-primary">+ Nová stránka</button>` : ''}
        </div>
        <div class="wiki-layout">
          <aside class="wiki-list" id="wiki-list"><div class="loading">Načítám…</div></aside>
          <section class="wiki-content" id="wiki-content"></section>
        </div>
      </div>`;

    const addBtn = mount.querySelector('#wiki-add');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const page = await createPage(ctx.email, { title: 'Nová stránka' });
        location.hash = `#/wiki/${page.id}`;
      });
    }

    loadList(mount.querySelector('#wiki-list'), activeId);
    loadContent(mount.querySelector('#wiki-content'), activeId, ctx);
  },
};

// ── Levý sloupec ──

async function loadList(el, activeId) {
  let pages;
  try {
    pages = await getPages();
  } catch (err) {
    el.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!pages.length) {
    el.innerHTML = `<div class="muted wiki-list-empty">Žádné stránky</div>`;
    return;
  }

  el.innerHTML = pages.map((p) => `
    <a href="#/wiki/${esc(p.id)}" class="wiki-item${p.id === activeId ? ' active' : ''}">${
      esc(p.title || '(bez názvu)')}</a>`).join('');
}

// ── Pravý sloupec ──

async function loadContent(el, id, ctx) {
  if (!id) {
    el.innerHTML = `<div class="empty-state">Vyber stránku vlevo.</div>`;
    return;
  }

  let page;
  try {
    page = await getPage(id);
  } catch (err) {
    el.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
    return;
  }

  if (!page) {
    el.innerHTML = `<div class="empty-state">Stránka neexistuje.</div>`;
    return;
  }

  showRead(el, page, ctx);
}

function metaLine(page) {
  return `<div class="wiki-meta muted">Upraveno ${esc(formatDate(page.updated_at))}</div>`;
}

/** Čtení — vyrenderovaný markdown. Tlačítko Upravit jen pro toho, kdo smí. */
function showRead(el, page, ctx) {
  el.innerHTML = `
    <div class="wiki-head">
      <h2>${esc(page.title || '(bez názvu)')}</h2>
      ${ctx.canEdit ? `<button id="wiki-edit" class="btn">Upravit</button>` : ''}
    </div>
    ${metaLine(page)}
    <div class="wiki-text">${page.text.trim() ? renderMarkdown(page.text) : '<p class="muted">Prázdná stránka.</p>'}</div>`;

  const btn = el.querySelector('#wiki-edit');
  if (btn) btn.addEventListener('click', () => showEdit(el, page, ctx));
}

/** Editace — název + markdown zdroj. Ukládá se při opuštění pole, jako v CRM. */
function showEdit(el, page, ctx) {
  el.innerHTML = `
    <div class="wiki-head">
      <input class="cell-input wiki-title" data-field="title" value="${esc(page.title)}" placeholder="Název stránky">
      <button id="wiki-done" class="btn btn-primary">Hotovo</button>
    </div>
    ${metaLine(page)}
    <textarea class="cell-textarea wiki-editor" data-field="text" placeholder="Text stránky — markdown: # nadpis, **tučně**, - seznam, [odkaz](https://…)">${esc(page.text)}</textarea>
    <div class="wiki-actions"><button id="wiki-del" class="btn btn-danger">Smazat stránku</button></div>`;

  const save = async (field, value) => {
    page = (await updatePage(page.id, ctx.email, { [field]: value })) || page;
    const meta = el.querySelector('.wiki-meta');
    if (meta) meta.textContent = `Upraveno ${formatDate(page.updated_at)}`;
    if (field === 'title') refreshListItem(page);
  };

  el.addEventListener('change', (e) => {
    const field = e.target.dataset.field;
    if (field) save(field, e.target.value);
  });

  el.querySelector('#wiki-done').addEventListener('click', () => showRead(el, page, ctx));

  el.querySelector('#wiki-del').addEventListener('click', async () => {
    if (!confirm('Smazat tuhle stránku?')) return;
    await deletePage(page.id);
    location.hash = '#/wiki';
  });
}

/** Přejmenování se hned projeví i vlevo, bez překreslení celého seznamu. */
function refreshListItem(page) {
  const item = document.querySelector(`.wiki-item[href="#/wiki/${page.id}"]`);
  if (item) item.textContent = page.title || '(bez názvu)';
}
