// ŠG wiki — vlevo seznam stránek, vpravo obsah vybrané stránky.
// Route: #/wiki (jen seznam) a #/wiki/<id> (seznam + obsah).
//
// Práva chodí z app.js jako `ctx.canEdit`. Bez nich je všechno jen ke čtení:
// žádné inputy, žádná tlačítka. Text stránky je markdown (viz markdown.js).
//
// Stránka má navíc `min_role` — od jaké hodnosti je čitelná. Schovávání dělá
// RLS, ne tenhle soubor: kdo na stránku nemá, ji z dotazu nedostane, takže
// v seznamu prostě není. Tady se jen nastavuje.

import { esc, formatDate, wireKeys, flash } from '../../util.js';
import { renderMarkdown } from './markdown.js';
import {
  getPages, getPage, createPage, updatePage, deletePage,
  VISIBILITY, DEFAULT_VISIBILITY, ROLE_LABEL,
} from './store.js';

export const wiki = {
  id: 'wiki',
  label: 'ŠG wiki',
  desc: 'Interní znalostní báze',
  levels: true,          // v Přístupech se nastavuje čtení / editace
  tileInfo,
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

/** Dlaždice na hubu: kolik stránek wiki má. Tichý počet, nic k řešení. */
async function tileInfo() {
  const pages = await getPages();
  return pages.length ? { badge: String(pages.length) } : null;
}

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
    el.innerHTML = `<div class="empty-state">Stránka neexistuje. <a href="#/wiki">Zpět na seznam</a></div>`;
    return;
  }

  showRead(el, page, ctx);
}

function metaLine(page) {
  const vis = page.min_role && page.min_role !== DEFAULT_VISIBILITY
    ? ` · vidí <strong>${esc(ROLE_LABEL[page.min_role] || page.min_role)}</strong> a výš`
    : '';
  return `<div class="wiki-meta muted">Upraveno ${esc(formatDate(page.updated_at))}${vis}</div>`;
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

/**
 * Editace — název, text a viditelnost.
 *
 * Ukládá se **tlačítkem**, ne při opuštění pole. Jsou to tři pole, takže to
 * pravidlo ze STANDARDS.md vyžaduje — a dřívější „Hotovo" navíc neukládalo
 * vůbec, jen zavíralo editor. Fungovalo to jen náhodou: kliknutí na tlačítko
 * nejdřív vyvolá blur textarey. Klávesnicí by se text ztratil.
 */
function showEdit(el, page, ctx) {
  el.innerHTML = `
    <div class="wiki-head">
      <input class="cell-input wiki-title" data-field="title" value="${esc(page.title)}" placeholder="Název stránky">
    </div>
    ${metaLine(page)}
    <textarea class="cell-textarea wiki-editor" data-field="text" placeholder="Text stránky — markdown: # nadpis, **tučně**, - seznam, [odkaz](https://…)">${esc(page.text)}</textarea>
    <div class="form-actions form-actions-sticky">
      <button id="wiki-del" class="btn btn-danger">Smazat stránku</button>
      <span class="form-actions-gap"></span>
      <label class="wiki-visibility">Vidí
        <select class="input" data-field="min_role">
          ${VISIBILITY.map((r) =>
            `<option value="${esc(r)}"${(page.min_role || DEFAULT_VISIBILITY) === r ? ' selected' : ''}>${esc(ROLE_LABEL[r])} a výš</option>`
          ).join('')}
        </select>
      </label>
      <span class="form-msg"></span>
      <button id="wiki-cancel" class="btn">Zrušit</button>
      <button id="wiki-save" class="btn btn-primary">Uložit změny</button>
    </div>`;

  const read = (field) => el.querySelector(`[data-field="${field}"]`).value;
  const msg = el.querySelector('.form-msg');

  const ulozit = async () => {
    let saved;
    try {
      saved = await updatePage(page.id, ctx.email, {
        title: read('title'),
        text: read('text'),
        min_role: read('min_role'),
      });
    } catch {
      // Nejčastější případ: někdo posouvá viditelnost nad vlastní hodnost.
      // RLS to odmítne, takže se nic nezměnilo — stránka je pořád jeho.
      // Tvářit se, že se uložilo, by bylo horší než chyba.
      el.querySelector('[data-field="min_role"]').value = page.min_role || DEFAULT_VISIBILITY;
      flash(msg, 'Výš, než jsi sám, stránku posunout nejde — přišel bys o ni.', 'error');
      return;
    }

    page = saved || page;
    refreshListItem(page);
    showRead(el, page, ctx);
  };

  const zrusit = () => showRead(el, page, ctx);

  wireKeys(el, { submit: ulozit, cancel: zrusit });
  el.querySelector('#wiki-save').addEventListener('click', ulozit);
  el.querySelector('#wiki-cancel').addEventListener('click', zrusit);

  el.querySelector('#wiki-del').addEventListener('click', async () => {
    if (!confirm(`Smazat stránku „${page.title || '(bez názvu)'}"? Nejde to vzít zpět.`)) return;
    await deletePage(page.id);
    location.hash = '#/wiki';
  });
}

/** Přejmenování se hned projeví i vlevo, bez překreslení celého seznamu. */
function refreshListItem(page) {
  const item = document.querySelector(`.wiki-item[href="#/wiki/${page.id}"]`);
  if (item) item.textContent = page.title || '(bez názvu)';
}
