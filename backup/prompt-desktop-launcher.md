# Prompt: Vytvoř desktop launcher pro projekt

Použij tento prompt v Claude Code pro jakýkoliv projekt, který potřebuje terminálový spouštěč na ploše.

---

## Prompt

```
Vytvoř pro tento projekt desktop launcher (.command soubor na plochu). Postup:

1. Vytvoř soubor ~/Desktop/{NÁZEV}.command s tímto obsahem:
   - #!/bin/bash
   - cd do adresáře projektu
   - printf '\033[38;5;{ČÍSLO_BARVY}m' pro nastavení barvy textu v terminálu
   - ANSI art banner (viz níže)
   - tabulka s portem a URL (box-drawing znaky ┌─┬┐│└─┴┘)
   - help řádek: r  restart  │  o  open browser  │  q  quit
   - spuštění dev serveru: npx vite --open --clearScreen false

2. chmod +x na ten soubor

3. Vygeneruj ikonu 512x512 PNG pomocí ImageMagick:
   magick -size 512x512 xc:"#1a1a1a" \
     -font "Monaco" -pointsize 32 -fill "{HEX_BARVA}" \
     -gravity center \
     -annotate +0-25 "{ŘÁDEK 1 BANNERU}" \
     -annotate +0+15 "{ŘÁDEK 2 BANNERU}" \
     -annotate +0+55 "{ŘÁDEK 3 BANNERU}" \
     /tmp/{název}-icon.png

4. Nastav ikonu na .command soubor:
   fileicon set ~/Desktop/{NÁZEV}.command /tmp/{název}-icon.png
   (pokud fileicon není nainstalovaný: brew install fileicon)

5. Ulož kopii .command souboru a ikony do backup/ složky v projektu.
```

---

## Co vyplnit

| Proměnná | Popis | Příklad (CRM-Mini) |
|---|---|---|
| `{NÁZEV}` | Název .command souboru | `CRM-Mini` |
| `{ČÍSLO_BARVY}` | ANSI 256 barva (0-255) | `88` (maroon) |
| `{HEX_BARVA}` | Hex barva pro ikonu | `#8b0000` |
| `{ŘÁDEK 1-3 BANNERU}` | ANSI art text | `▄████▄ █████▄ █████▄` |
| Port | Číslo portu dev serveru | `5173` |

---

## Příklady barev (ANSI 256 + HEX)

| Barva | ANSI číslo | HEX |
|---|---|---|
| Maroon | 88 | #8b0000 |
| Blue | 27 | #005fff |
| Green | 28 | #008700 |
| Orange | 208 | #ff8700 |
| Purple | 93 | #8700ff |
| Teal | 30 | #008787 |
| Red | 196 | #ff0000 |

---

## ANSI art generátor

Pro vygenerování blokového banneru můžeš použít prompt:

```
Vygeneruj 3-řádkový ANSI art banner pro text "{TEXT}" 
pomocí Unicode block znaků (▄ █ ▀ ▄▄ ██ atd.), 
stejný styl jako:

▄████▄ █████▄ █████▄ 
██  ██ ██▄▄█▀ ██▄▄█▀ 
▀████▀ ██     ██     
```

---

## Referenční soubor

Aktuální fungující příklad: `backup/CRM-Mini.command`
