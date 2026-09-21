// Small shared helpers. One definition, used everywhere — no per-file copies.

/**
 * Spustí načítání a případnou chybu ukáže tam, kam se mělo vykreslit.
 *
 * Bez toho zůstane po chybě na obrazovce viset „Načítám…" a nikde se nic
 * neobjeví — což vypadá jako zamrznutí, ne jako problém s připojením.
 */
export async function guard(el, load) {
  try {
    await load();
  } catch (err) {
    el.innerHTML = `<div class="error">Chyba: ${esc(err.message)}</div>`;
  }
}

/** Escape text for safe insertion into HTML. */
export function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format an ISO date/timestamp as DD.MM.YYYY (cs). Empty string if falsy. */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Zkrácené peníze do těsných míst: "8 500 Kč", "300k Kč", "1,2M Kč".
 * Pod deset tisíc se nezkracuje — tam by se ztratila přesnost, kterou čekáš.
 */
export function formatMoneyShort(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';

  const abs = Math.abs(n);
  if (abs < 10000) return formatMoney(Math.round(n));
  if (abs < 1000000) return `${Math.round(n / 1000)}k Kč`;
  return `${(Math.round(n / 100000) / 10).toLocaleString('cs-CZ')}M Kč`;
}

/** ISO timestamp as "09.09.2026 14:32". Empty string if falsy. */
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  return d.toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Kompaktní stáří: pod den v hodinách ("5 h"), jinak ve dnech ("3 d"). */
export function ageShort(value) {
  if (!value) return '';
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '';
  const hours = Math.max(0, Math.floor(ms / 3600000));
  return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}

/** Number as "1 250 000 Kč". Empty string for null/'' — ale 0 je platná hodnota. */
export function formatMoney(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('cs-CZ') + ' Kč';
}

/** "před 3 dny" style relative label from a date. */
export function timeAgo(value) {
  if (!value) return 'nikdy';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'dnes';
  if (days === 1) return 'včera';
  if (days < 7) return `před ${days} dny`;
  if (days < 30) return `před ${Math.floor(days / 7)} týdny`;
  if (days < 365) return `před ${Math.floor(days / 30)} měs.`;
  return `před ${Math.floor(days / 365)} lety`;
}

/** Názvy měsíců v prvním pádě. Jedna definice — byly čtyři kopie ve čtyřech modulech. */
export const MONTH_NAMES = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

/**
 * Šestý pád — „v lednu", „v červenci", „v září".
 *
 * Vlastní tabulka, ne přilepené „u": devět z dvanácti měsíců při skloňování
 * mění kmen (březen → březnu) a dva mají úplně jinou koncovku (červenci,
 * prosinci). „v březenu" vypadá jako chyba programu, protože to chyba programu je.
 */
export const MONTH_IN = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu',
  'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'];

/**
 * Co má klávesa udělat. Čistá funkce, aby to šlo otestovat bez prohlížeče.
 *
 *   tag  — velkými písmeny: 'INPUT' | 'TEXTAREA' | 'SELECT' | 'BUTTON' | 'A'
 *   meta — je stisknutý Cmd nebo Ctrl
 *
 * Pravidla: Enter v jednořádkovém poli potvrdí. V textarea ne — tam Enter dělá
 * nový řádek a musí ho dělat dál, takže potvrzuje až Cmd/Ctrl+Enter. Na
 * tlačítku a odkazu se Enter neodchytává, ty si ho obslouží samy (jinak by
 * se akce provedla dvakrát). Esc ruší vždycky.
 */
export function keyAction({ key, tag, meta = false }) {
  if (key === 'Escape') return 'cancel';
  if (key !== 'Enter') return null;
  if (tag === 'BUTTON' || tag === 'A') return null;
  if (tag === 'TEXTAREA') return meta ? 'submit' : null;
  return 'submit';
}

/**
 * Naváže klávesové zkratky na kus DOMu.
 *
 *   wireKeys(panel, { submit: () => ulozit(), cancel: () => zavrit() });
 *
 * Tlačítka zůstávají tam, kde jsou — tohle je zkratka navíc, ne náhrada.
 * Proto to neporušuje pravidlo „hidden interactions ne": klikací cesta se
 * nemění, jen přestává být jediná.
 */
export function wireKeys(scope, { submit = null, cancel = null } = {}) {
  scope.addEventListener('keydown', (e) => {
    const action = keyAction({ key: e.key, tag: e.target.tagName, meta: e.metaKey || e.ctrlKey });
    const handler = action === 'submit' ? submit : action === 'cancel' ? cancel : null;
    if (!handler) return;
    e.preventDefault();
    e.stopPropagation();   // vnořený panel nesmí zavřít i ten nad sebou
    handler();
  });
}

/**
 * Krátká hláška u tlačítka: „Uloženo." nebo důvod, proč ne.
 *
 * Bez ní se po uložení jen překreslí tabulka — a když se viditelně nic
 * nezmění (opravíš překlep v poznámce), nejde poznat, jestli se to uložilo.
 * Vzor je převzatý z ručního zápisu výkazu, kde fungoval jako jediný v aplikaci.
 *
 * `tone`: 'ok' (zelená, samo zmizí) | 'error' (červená, zůstane)
 */
export function flash(el, text, tone = 'ok') {
  if (!el) return;
  el.textContent = text;
  el.className = `form-msg form-msg-${tone}`;

  clearTimeout(el._flash);
  if (tone !== 'ok') return;

  // Potvrzení zmizí samo — chyba ne, tu si musíš přečíst.
  el._flash = setTimeout(() => {
    if (el.className.endsWith('-ok')) { el.textContent = ''; el.className = 'form-msg'; }
  }, 2500);
}
