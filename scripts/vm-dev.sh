#!/usr/bin/env bash
# Startet den Dev-Server der App in der VM.
# - stellt sicher, dass node_modules VM-lokal gebunden ist (überlebt VM-Reboots nicht)
# - installiert Dependencies, falls noch nicht geschehen
# - startet Vite (im LAN erreichbar für Geräte-Tests)
set -euo pipefail

PROJECT=/home/ubuntu/alltags-helfer
NM_STORE=/home/ubuntu/nm

mkdir -p "$NM_STORE" "$PROJECT/node_modules"
if ! mountpoint -q "$PROJECT/node_modules"; then
  sudo mount --bind "$NM_STORE" "$PROJECT/node_modules"
  echo "node_modules-Bind gesetzt."
fi

cd "$PROJECT"
if [ ! -d node_modules/.bin ]; then
  echo "Installiere Dependencies ..."
  npm install --no-fund --no-audit
fi

exec npm run dev -- --host 0.0.0.0
