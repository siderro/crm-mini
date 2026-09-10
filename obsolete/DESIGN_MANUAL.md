# SG Terminal Design Manual

Design system for web applications at Svejda-Goldmann. Inspired by DOS/NetWare terminal aesthetics — monospace, EGA palette, block characters.

---

## 1. Philosophy

- Everything is text. No icons, no gradients, no rounded corners.
- One font, one size, everywhere. No visual hierarchy through font size — use color instead.
- Fill the space. Empty areas get character fill (░), not whitespace.
- If it could run on a 386, it's correct.
- Everything must be selectable text. No images, no SVGs, no canvas. Logos are built from block characters (▓░) rendered as real DOM text nodes.

---

## 2. Typography

- **Font:** system `monospace` (Courier New, Consolas, or browser default)
- **Size:** `14px` globally — headings, body, links, labels, all the same
- **Line height:** `1.2`
- No bold, no italic. Differentiate by color only.

---

## 3. Color Palette (EGA 16)

All colors in the project must come from this palette. No exceptions.

| #  | Name           | Hex       | Usage                              |
|----|----------------|-----------|------------------------------------|
| 0  | Black          | `#000000` | Text on inverse hover              |
| 1  | Blue           | `#0000AA` | Logo dark, decorative elements     |
| 2  | Green          | `#00AA00` | Normal pair for bright green       |
| 3  | Cyan           | `#00AAAA` | Normal pair for bright cyan        |
| 4  | Red            | `#AA0000` | Normal pair for bright red         |
| 5  | Magenta        | `#AA00AA` | Normal pair for bright magenta     |
| 6  | Brown          | `#AA5500` | Normal pair for bright yellow      |
| 7  | Light Gray     | `#AAAAAA` | Default body text                  |
| 8  | Dark Gray      | `#555555` | Muted text, URLs, fill characters  |
| 9  | Bright Blue    | `#5555FF` | Available for sections             |
| 10 | Bright Green   | `#55FF55` | Section headings                   |
| 11 | Bright Cyan    | `#55FFFF` | Primary accent, links, headings    |
| 12 | Bright Red     | `#FF5555` | Section headings, errors           |
| 13 | Bright Magenta | `#FF55FF` | Section headings                   |
| 14 | Bright Yellow  | `#FFFF55` | Section headings, warnings         |
| 15 | Bright White   | `#FFFFFF` | Emphasis where needed              |

### Color pairing rule

Each section/column gets a **bright + normal pair** from the same hue:

| Section color  | Title (bright) | Separator / accent (normal) |
|----------------|----------------|-----------------------------|
| Cyan           | `#55FFFF`      | `#00AAAA`                   |
| Green          | `#55FF55`      | `#00AA00`                   |
| Yellow         | `#FFFF55`      | `#AA5500`                   |
| Magenta        | `#FF55FF`      | `#AA00AA`                   |
| Red            | `#FF5555`      | `#AA0000`                   |
| Blue           | `#5555FF`      | `#0000AA`                   |

---

## 4. Background

- **Page background:** `#0C0C0C` (near-black, not pure black)
- Never use colored backgrounds for layout — only for interactive states (hover)

---

## 5. Layout Structure

Every app follows a **1 + N column grid:**

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  BRAND   │ Content  │ Content  │ Content  │ Content  │ Content  │
│  column  │ column   │ column   │ column   │ column   │ column   │
│          │          │          │          │          │          │
│  Logo    │  Title   │  Title   │  Title   │  Title   │  Title   │
│  Date    │  ------  │  ------  │  ------  │  ------  │  ------  │
│  Time    │  Items   │  Items   │  Items   │  Items   │  Items   │
│  Menu    │  ...     │  ...     │  ...     │  ...     │  ...     │
│  (future)│  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │
│          │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │
│          │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │  ░░░░░░  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Brand column (column 1)

- ASCII-art logo (▓/░ block characters, blue + cyan)
- Date, time, day of week (live, updated every second)
- Future: navigation menu, app status, user info

### Content columns (columns 2–N)

- Each column has a **colored title** (bright EGA color)
- Separator line under title: `------------------------` (normal EGA pair)
- Content below (links, data, forms, whatever the app needs)
- **Column fill** (░ characters in dark gray `#555555`) fills remaining space to the bottom

### CSS structure

```css
/* Full viewport height, no scroll */
html, body {
  font-family: monospace;
  font-size: 14px;
  background: #0c0c0c;
  color: #aaaaaa;
  height: 100vh;
}

/* Grid fills the viewport */
.container {
  display: grid;
  grid-template-columns: repeat(N, 1fr);  /* N = total columns */
  gap: 24px;
  width: 100%;
  padding: 32px;
  align-items: stretch;
  height: 100vh;
}

/* Content columns use flex to push fill to bottom */
.column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Fill character block — always last child */
.fill {
  color: #555555;
  flex: 1 1 0px;
  min-height: 0;
  word-break: break-all;
  line-height: 1.2;
  margin-top: 8px;
  overflow: hidden;
  user-select: none;
}
```

---

## 6. Interactive Elements

### Links

```css
a {
  color: #55ffff;           /* bright cyan */
  text-decoration: underline;
  display: block;
}
```

### Hover — inverse box

```css
a:hover {
  background: #55FFFF;      /* bright cyan background */
  color: #000000;           /* black text */
  text-decoration: none;
}
```

This "inverse video" effect is the standard terminal selection style. Always use bright cyan background + black text for hover, regardless of column color.

### URL labels (under links)

```css
.url {
  color: #555555;           /* dark gray */
  margin-bottom: 8px;
}
```

---

## 7. Decorative Elements

### Section separators

Dashed line from the normal color of the section pair:

```
------------------------
```

### Column fill — ░ character background

The ░ character fills remaining vertical space in each column down to the bottom of the page (inspired by NetWare console backgrounds).

**What doesn't work:**
- CSS `::after` pseudo-element with `content: '░░░...'` — pseudo-elements don't participate properly in flex layout. The text content defines an intrinsic height that `flex-grow` cannot shrink below, so all columns get the same fill height regardless of content.
- CSS `::after` with `flex: 1 1 0` + `min-height: 0` + `overflow: hidden` — still doesn't work reliably, pseudo-elements ignore flex sizing constraints on their text content.

**What works:**
A real `<div class="fill">` element as the last child in each column, filled with ░ characters via JS.

Requirements for this to work:
1. Grid container must have `height: 100vh` and `align-items: stretch` (all columns same height)
2. Each column must be `display: flex; flex-direction: column; overflow: hidden`
3. The fill div needs `flex: 1 1 0px; min-height: 0; overflow: hidden` (takes only remaining space)
4. The fill div must contain enough ░ characters to overflow (JS generates ~2000)
5. `user-select: none` prevents accidental selection of decorative characters
6. `word-break: break-all` ensures ░ characters wrap to fill the width

```html
<!-- Last child in each content column -->
<div class="fill"></div>
```

```css
.fill {
  color: #555555;
  flex: 1 1 0px;
  min-height: 0;
  word-break: break-all;
  line-height: 1.2;
  margin-top: 8px;
  overflow: hidden;
  user-select: none;
}
```

```js
document.querySelectorAll('.fill').forEach(function(el) {
  var chars = '';
  for (var i = 0; i < 2000; i++) chars += '░';
  el.textContent = chars;
});
```

The key insight: real DOM elements respect `flex: 1 1 0px` + `min-height: 0` properly — they shrink to zero and grow only into available space. Pseudo-elements don't.

### ASCII-art logo

Built from ▓ (blue `#0000AA`) and ░ (bright cyan `#55FFFF`) block characters. Each app can have its own logo pattern, but always using these two characters and colors.

---

## 8. Starter Kit File Structure

```
project/
├── index.html          # Main page with grid layout
├── style.css           # Styles (copy from template)
├── script.js           # DateTime + fill logic
├── manifest.json       # Chrome extension manifest (if needed)
├── PALETTE.md          # EGA palette reference
├── DESIGN_MANUAL.md    # This file
└── CLAUDE.md           # AI development instructions
```

---

## 9. Rules Summary

1. **One font, one size** — monospace 14px everywhere
2. **EGA only** — no colors outside the 16-color palette
3. **Bright/normal pairs** — titles bright, accents normal
4. **No whitespace** — fill empty space with ░ in dark gray
5. **Inverse hover** — bright cyan bg + black text
6. **Column 1 = brand** — logo, time, navigation
7. **Full viewport** — no scroll, grid fills 100vh
8. **No frameworks** — plain HTML + CSS + JS
