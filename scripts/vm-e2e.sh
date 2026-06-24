#!/usr/bin/env bash
# E2E-Smoke (Playwright) in der VM: Bind sicherstellen, @playwright/test + Chromium
# installieren (idempotent), Smoke-Tests laufen lassen.
set -euo pipefail

PROJECT=/home/ubuntu/alltags-helfer
NM_STORE=/home/ubuntu/nm

mkdir -p "$NM_STORE" "$PROJECT/node_modules"
if ! mountpoint -q "$PROJECT/node_modules"; then
  sudo mount --bind "$NM_STORE" "$PROJECT/node_modules"
  echo "node_modules-Bind gesetzt."
fi

cd "$PROJECT"
if [ ! -d node_modules/@playwright/test ]; then
  echo "Installiere @playwright/test ..."
  npm install -D @playwright/test --no-fund --no-audit
fi

echo "=== Playwright-Browser (Chromium + Deps) ==="
npx playwright install --with-deps chromium

echo "=== E2E-Smoke ==="
# Ausgabe in einen VM-LOKALEN Ordner: auf dem sshfs-Mount scheitert mkdir (EPERM).
# In CI greift der Default (test-results/), dort ist es kein Mount.
npx playwright test --output=/home/ubuntu/pw-results
echo "=== E2E GRUEN ==="
