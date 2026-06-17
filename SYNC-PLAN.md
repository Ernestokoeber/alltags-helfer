# Geräte-Sync — Plan & Stand

> **Stand:** 2026-06-17 · **Status:** umgesetzt & verifiziert (Worker live, App-Client fertig). Bereit für den End-to-End-Test Handy ⇄ PC.
> Echter automatischer Abgleich (Handy ⇄ PC) mit **Ende-zu-Ende-Verschlüsselung**.

---

## 1. Architektur (umgesetzt)

```
 Handy-PWA            PC-PWA            ← unverändert auf GitHub Pages (gleiche Origin)
    │  IndexedDB/Dexie (offline-first)  │
    └─────────────┬─────────────────────┘
                  ↓ POST /sync  (Bearer: Sync-Code, CORS)
        Cloudflare Worker  +  D1 (records-Tabelle)
            speichert nur E2EE-Chiffrat
```

**Bewusste Entscheidung (17.06.):** App **bleibt auf GitHub Pages** (kein Umzug zu Cloudflare Pages) — gleiche URL/Origin → installierte PWAs und lokale Daten bleiben erhalten. Sync ist rein additiv.

| Thema | Entscheidung |
|---|---|
| Hosting | GitHub Pages (App) **+** Cloudflare Worker (Sync-API), CORS |
| Datenbank | Cloudflare **D1** (`alltags-helfer`, Region WEUR), Tabelle `records` mit server-`seq`-Cursor |
| Zugriffsschutz | **Sync-Code** = Bearer-Token (Worker-Secret `SYNC_SECRET`, konstantzeitig geprüft) |
| Konfliktregel | **Last-Write-Wins** über `updatedAt` (wie das Backup-Feature) |
| Verschlüsselung | **E2EE**: PBKDF2 (310k) → AES-GCM im Client; Server sieht nur Chiffrat. Metadaten (id, collection, updatedAt, deleted) bleiben Klartext für den Merge |
| Sync-Trigger | App-Start + Rückkehr in den Vordergrund + alle 2 Min + manueller Button |

## 2. Bausteine

- **Worker:** `sync-worker/` — `src/index.ts` (`POST /sync`: Pull+Push/LWW, Bearer-Auth, CORS), `schema.sql`, `wrangler.jsonc`. Deploy via Wrangler aus der VM (API-Token in `~/.cf_token`).
  - **Live:** `https://alltags-helfer-sync.ekoeber.workers.dev`
- **Client:** `src/lib/crypto.ts` (E2EE), `src/lib/sync.ts` (Sammeln/Verschlüsseln/Push-Pull/Cursor), `src/lib/sync-state.svelte.ts` (Status + Auto-Sync-Trigger).
- **UI:** „Einstellungen" → Sync-Code + E2EE-Passwort eingeben, „Speichern & synchronisieren", Status; Auto-Sync im Layout.

## 3. Einrichtung pro Gerät

1. App öffnen → **Einstellungen → Geräte-Sync**.
2. **Sync-Code** eingeben (= `SYNC_SECRET`, liegt in der VM unter `~/.sync_secret`).
3. **E2EE-Passwort** eingeben — **auf allen Geräten identisch**, frei wählbar (merkbar, aber stark). Verlässt das Gerät nie.
4. „Speichern & synchronisieren". **Erst Gerät 1 einrichten** (legt Salt + Verifier an), **dann Gerät 2** (übernimmt Salt, prüft Passwort).

## 4. Phasen (alle erledigt)

- [x] **Phase 0** — VM lauffähig, Cloudflare-API-Token.
- [x] **Phase 1** — D1 + Worker deployt, per curl verifiziert (Health, 401, Push/Pull-Roundtrip).
- [x] **Phase 2** — Krypto + Sync-Client (TDD: crypto/sync-Tests grün).
- [x] **Phase 3** — UI in „Einstellungen" + Auto-Sync.
- [ ] **Phase 4** — End-to-End Handy ⇄ PC (Notiz/Termin/Löschung), nach Live-Deploy. ← *nächster Schritt mit dem Nutzer*

## 5. Betrieb / Wartung

- **Worker neu deployen:** in der VM `cd sync-worker && CLOUDFLARE_API_TOKEN=$(cat ~/.cf_token) npx wrangler deploy`.
- **Secret ändern:** `npx wrangler secret put SYNC_SECRET` (dann auf allen Geräten neu eintragen).
- **D1 ansehen:** `npx wrangler d1 execute alltags-helfer --remote --command "SELECT collection, COUNT(*) FROM records GROUP BY collection"`.
- **API-Token** braucht Permissions `Workers Scripts:Edit` + `D1:Edit` (Account-scope).

## 6. Risiken / Hinweise

- **Local-first bleibt:** Sync ist additiv, offline funktioniert alles unverändert.
- **Falsches E2EE-Passwort** → Entschlüsselung schlägt fehl, klare Fehlermeldung, **keine** kaputten Daten (Verifier-Record erkennt es früh).
- **Metadaten** (Anzahl/Zeitstempel/Typen) sieht der Server; **Inhalte** nie.
- **Salt-Race** nur theoretisch, wenn zwei Geräte gleichzeitig erstmalig syncen → daher Gerät 1 vor Gerät 2 einrichten.
