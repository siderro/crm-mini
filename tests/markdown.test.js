import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/modules/wiki/markdown.js';

// Wiki je jediné místo, kde se z uživatelského textu dělá HTML. Tyhle testy
// hlídají invariant, na kterém to stojí: escapuje se PRVNÍ, značky se vkládají
// až potom. Kdo to prohodí, otevře XSS — a spadne mu tenhle soubor.

test('HTML v textu se nevykreslí, jen vypíše', () => {
  const out = renderMarkdown('<script>alert(1)</script>');
  assert.ok(!out.includes('<script>'), 'script tag prošel');
  assert.ok(out.includes('&lt;script&gt;'));
});

test('obrázek s onerror se nevykreslí', () => {
  const out = renderMarkdown('<img src=x onerror=alert(1)>');
  assert.ok(!out.includes('<img'), 'img tag prošel');
});

test('javascript: odkaz zůstane textem', () => {
  const out = renderMarkdown('[klikni](javascript:alert(1))');
  assert.ok(!out.includes('href="javascript'), 'javascript: odkaz prošel');
  assert.ok(out.includes('[klikni]'));
});

test('data: odkaz zůstane textem', () => {
  const out = renderMarkdown('[x](data:text/html,neco)');
  assert.ok(!out.includes('href="data:'), 'data: odkaz prošel');
});

test('uvozovka v odkazu nevyskočí z atributu', () => {
  const out = renderMarkdown('[x](https://a.cz/"onmouseover="alert(1))');
  assert.ok(!out.includes('onmouseover="alert'), 'povedlo se vyskočit z href');
});

test('povolená schémata projdou', () => {
  assert.ok(renderMarkdown('[x](https://example.com)').includes('href="https://example.com"'));
  assert.ok(renderMarkdown('[x](mailto:a@b.cz)').includes('href="mailto:a@b.cz"'));
  assert.ok(renderMarkdown('[x](#/crm)').includes('href="#/crm"'));
});

test('nadpisy začínají na h2, h1 patří názvu stránky', () => {
  assert.ok(renderMarkdown('# Nadpis').includes('<h2>Nadpis</h2>'));
  assert.ok(renderMarkdown('## Nadpis').includes('<h3>Nadpis</h3>'));
  assert.ok(renderMarkdown('### Nadpis').includes('<h4>Nadpis</h4>'));
});

test('seznamy', () => {
  const ul = renderMarkdown('- jedna\n- dvě');
  assert.ok(ul.includes('<ul>'));
  assert.equal(ul.match(/<li>/g).length, 2);

  const ol = renderMarkdown('1. jedna\n2. dvě');
  assert.ok(ol.includes('<ol>'));
  assert.equal(ol.match(/<li>/g).length, 2);
});

test('odstavec spojí řádky, prázdný řádek ho ukončí', () => {
  const out = renderMarkdown('první\ndruhý\n\ntřetí');
  assert.ok(out.includes('<p>první druhý</p>'));
  assert.ok(out.includes('<p>třetí</p>'));
});

test('blok kódu se neformátuje', () => {
  const out = renderMarkdown('```\n**tučně**\n```');
  assert.ok(out.includes('<pre><code>**tučně**'));
  assert.ok(!out.includes('<strong>'));
});

test('tučně, kurzíva, kód uvnitř řádku', () => {
  assert.ok(renderMarkdown('**a**').includes('<strong>a</strong>'));
  assert.ok(renderMarkdown('*a*').includes('<em>a</em>'));
  assert.ok(renderMarkdown('`a`').includes('<code>a</code>'));
});

test('běžný text s čísly neudělá kód', () => {
  // Kód se uvnitř řádku vyjímá přes zástupný znak s číslem uprostřed.
  // Běžná věta s čísly ho nesmí spustit.
  const out = renderMarkdown('Cena je 5 kusů za 10 Kč.');
  assert.ok(!out.includes('<code>'), 'číslo v textu se změnilo na kód');
  assert.ok(out.includes('Cena je 5 kusů za 10 Kč.'));
});

test('citace a oddělovač', () => {
  assert.ok(renderMarkdown('> citace').includes('<blockquote>citace</blockquote>'));
  assert.ok(renderMarkdown('---').includes('<hr>'));
});

test('prázdný vstup nespadne', () => {
  assert.equal(renderMarkdown(''), '');
  assert.equal(renderMarkdown(null), '');
});
