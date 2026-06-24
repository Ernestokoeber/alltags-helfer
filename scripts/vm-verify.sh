#!/usr/bin/env bash
# Verifikation in der VM: node_modules-Bind sicherstellen, dann check + test + build.
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

echo "=== svelte-check ==="
npm run check
echo "=== vitest ==="
npm test
echo "=== build ==="
npm run build
echo "=== ALLES GRUEN ==="
