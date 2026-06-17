#!/bin/bash
cd "/Users/jakubgoldmann/Library/CloudStorage/Dropbox/Skripty/crm-mini"

# Maroon/dark red color for all output
printf '\033[38;5;88m'

echo ""
echo "  ▄████▄ █████▄ █████▄ "
echo "  ██  ██ ██▄▄█▀ ██▄▄█▀ "
echo "  ▀████▀ ██     ██     "
echo ""
echo "  ┌──────────┬────────────────────────┐"
echo "  │ Port     │ 5173                   │"
echo "  │ URL      │ http://localhost:5173  │"
echo "  └──────────┴────────────────────────┘"
echo ""
echo "  r  restart  │  o  open browser  │  q  quit"
echo ""

npx vite --open --clearScreen false
