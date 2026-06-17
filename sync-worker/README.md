# sync-worker — Geräte-Sync-API (Cloudflare Worker + D1)

Backend für den Geräte-Sync des Alltags-Helfers. Die App selbst bleibt auf
**GitHub Pages**; dieser Worker ist rein additiv. Pro Datensatz wird nur ein
**Ende-zu-Ende-verschlüsseltes Blob** + Sync-Metadaten gespeichert — der Server
sieht weder Klartext noch Schlüssel.

- **Endpoint:** `POST /sync` mit `{ since, changes[] }` → Pull (Server→Client-Deltas)
  + Push (Last-Write-Wins) in einem Round-Trip. Antwort: `{ cursor, changes[] }`.
- **Auth:** `Authorization: Bearer <SYNC_SECRET>` (Worker-Secret, konstantzeitig geprüft).
- **CORS:** nur erlaubte Origins (github.io + localhost-Dev).

## Deploy via Wrangler (wird in der VM ausgeführt)

```bash
# Token bereitstellen (einmalig, vom Nutzer):  ~/.cf_token enthält den API-Token
export CLOUDFLARE_API_TOKEN=$(cat ~/.cf_token)

cd sync-worker

# 1) D1-Datenbank anlegen → database_id in wrangler.jsonc eintragen
npx wrangler d1 create alltags-helfer

# 2) Schema einspielen (remote)
npx wrangler d1 execute alltags-helfer --remote --file=schema.sql

# 3) Secret setzen (der Sync-Code)
npx wrangler secret put SYNC_SECRET

# 4) Deploy → liefert die *.workers.dev-URL
npx wrangler deploy
```

## Alternativ: komplett im Dashboard (ohne Wrangler)

1. **Workers & Pages → D1 → Create database** `alltags-helfer`.
2. Im **Console**-Tab der DB den Inhalt von `schema.sql` ausführen.
3. **Workers & Pages → Create → Worker**, Code aus `src/index.ts` einfügen, deployen.
4. Worker-**Settings → Bindings → D1** hinzufügen: Variable `DB` → DB `alltags-helfer`.
5. Worker-**Settings → Variables and Secrets → Secret** `SYNC_SECRET` setzen.
6. Worker-URL kopieren → in den App-Client (`src/lib/sync.ts`) eintragen.

## Schnelltest (nach Deploy)

```bash
# Health (ohne Auth)
curl https://<worker>.workers.dev/health        # -> {"ok":true}

# Auth-Check: falsches Token -> 401
curl -X POST https://<worker>.workers.dev/sync -H 'Authorization: Bearer falsch' \
  -H 'Content-Type: application/json' -d '{"since":0,"changes":[]}'
```
