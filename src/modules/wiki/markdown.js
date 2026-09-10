// Minimální markdown → HTML. Vlastní, ať kvůli wiki netaháme knihovnu.
//
// Umí: # nadpisy (1–3), **tučně**, *kurzíva*, `kód`, ```blok kódu```,
// - a 1. seznamy, > citace, --- oddělovač, [text](odkaz), odstavce.
// Neumí (schválně): tabulky, obrázky, vnořené seznamy, HTML uvnitř textu.
//
// Vstup se nejdřív celý escapuje, teprve pak se vkládají značky — do výstupu
// se tedy nedá propašovat cizí HTML.

import { esc } from '../../util.js';

/** Odkaz pustíme jen na bezpečné schéma; jinak z něj zůstane holý text. */
function safeHref(url) {
  const u = url.trim();
  return /^(https?:\/\/|mailto:|#|\/)/i.test(u) ? u : null;
}

/** Značky uvnitř řádku. `kód` se vyjme napřed, ať se v něm nic nenahrazuje. */
function inline(text) {
  const code = [];
  // Zastupny znak \u0000 se v psanem textu nevyskytuje, nic se s nim nesrazi.
  let out = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(c) - 1}\u0000`);

  out = out
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const href = safeHref(url);
      return href ? `<a href="${href}">${label}</a>` : m;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${code[i]}</code>`);
}

export function renderMarkdown(source) {
  const lines = esc(source || '').split(/\r?\n/);
  const html = [];
  let list = null;        // 'ul' | 'ol' | null
  let para = [];          // rozepsaný odstavec
  let fence = null;       // rozepsaný blok kódu

  const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
  const closePara = () => {
    if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const closeAll = () => { closePara(); closeList(); };

  for (const line of lines) {
    if (fence !== null) {
      if (line.trim().startsWith('```')) {
        html.push(`<pre><code>${fence.join('\n')}</code></pre>`);
        fence = null;
      } else {
        fence.push(line);
      }
      continue;
    }

    if (line.trim().startsWith('```')) { closeAll(); fence = []; continue; }

    if (!line.trim()) { closeAll(); continue; }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeAll();
      const level = heading[1].length + 1;   // # → h2, ať h1 zůstane názvu stránky
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { closeAll(); html.push('<hr>'); continue; }

    // Escapované '>' — text sem přichází už po esc().
    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closeAll();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const number = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || number) {
      closePara();
      const want = bullet ? 'ul' : 'ol';
      if (list !== want) { closeList(); html.push(`<${want}>`); list = want; }
      html.push(`<li>${inline((bullet || number)[1])}</li>`);
      continue;
    }

    closeList();
    para.push(line.trim());
  }

  if (fence !== null) html.push(`<pre><code>${fence.join('\n')}</code></pre>`);
  closeAll();
  return html.join('\n');
}
