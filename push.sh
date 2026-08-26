#!/bin/bash
# Script automatico di aggiornamento GitHub per SmartMenu Australia

cd "$(dirname "$0")"

# Copia index.html in dist/ per compatibilità con build statiche
if [ -d "dist" ]; then
  cp index.html dist/index.html
fi

# Messaggio di commit personalizzato o default con data/ora
MSG="${1:-Update SmartMenu Australia $(date '+%Y-%m-%d %H:%M')}"

echo "🚀 Inizio sincronizzazione con GitHub..."
git add .
git commit -m "$MSG"
git push origin main

echo "✅ Aggiornamento completato con successo su https://mrrobot7733.github.io/smart-qr-menu-australia/"
