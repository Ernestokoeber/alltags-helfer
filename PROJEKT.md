# Alltags-Helfer — Projektplan

> **Stand:** 2026-06-05 · **Owner:** Ernestokoeber · **Status:** Planung abgeschlossen, Start P0

Ein **local-first Second-Brain & Daily-Planner**: Notizen (Text + Sprache), Termine
mit Vorbereitung & Erinnerung, Bucketlist, Schlaf-Tracking und ein sanftes
Morgen-Briefing — datenschutzfreundlich, offline-fähig, mit offener Schnittstelle
für eigene Apps (z. B. Lern-App).

**Leitprinzip:** Die App *schreibt nichts vor*. Sie zeigt, ordnet, erinnert und
schlägt sanft vor — die Entscheidung bleibt beim Nutzer.

---

## Umgesetzt (Stand: 2026-06-12)

> Wird bei jedem Feature-Commit mitgepflegt.

- **Projekte (Arbeits-Notizen gebündelt):** eigene Seite mit Projektliste (Name, Beschreibung, Kategorie, Notiz-Anzahl) und Detailansicht je Projekt mit schneller Projekt-Notiz (erbt die Projekt-Kategorie). Archivieren statt löschen; Löschen löst nur die Zuordnung, Notizen bleiben. Notizen tragen ein Projekt-Chip in der Notizen-Liste. Dexie-Migration **v3** (`projects`-Tabelle + `projectId`-Index an `notes`).
- **Datensicherung (Export/Import):** Seite „Einstellungen" (Zahnrad im Header): alle Daten als JSON-Datei exportieren und auf einem anderen Gerät importieren — Merge per **Last-Write-Wins** über `updatedAt` (gleiche Konfliktregel wie der spätere P6-Sync), Tombstones inklusive, v1/v2-Sicherungen werden beim Import migriert. Überbrückt den fehlenden Geräte-Sync.
- **Sphären-Sicht (Privat ⇄ Arbeit):** globaler Umschalter im Header (Privat / Alles / Arbeit, in localStorage gemerkt) filtert Notizen, Termine, Bucketlist und das Heute-Briefing. „Offene" Einträge erscheinen in jeder Sphäre. Reine Logik in `src/lib/sphere.ts` (getestet), Zustand in `src/lib/sphere-state.svelte.ts`. **Termine haben dafür eine Kategorie bekommen** (Dexie-Migration v2, Bestand → `offen`). UI-Label für `geschaeftlich` ist jetzt „Arbeit".
- **Design „Zwei Sphären":** dunkles Premium-Theme (zinc-950) mit Glas-Karten, Farbwelten Privat = Amber / Arbeit = Himmelblau (als weiche Hintergrund-Flächen, Badges und Chips), schwebende Glas-Navigation, Outfit-Schrift (selbst gehostet via `@fontsource-variable/outfit`, offline-fähig), Inline-SVG-Icons (`src/lib/components/Icon.svelte`) statt Emojis, neues App-Icon/Favicon (zwei verschmelzende Sphären, `scripts/gen-icons.mjs`). Wiederkehrende Bausteine (`card`, `field`, `btn-primary`, `chip`) in `src/app.css`.
- **Fundament:** SvelteKit 2 + Svelte 5 + TypeScript + Tailwind v4, `adapter-static` (SPA), local-first via IndexedDB/Dexie (sync-fähiges Schema, UUID/`updatedAt`/Tombstone).
- **PWA-Kern (P0 abgeschlossen):** installierbar via Web-App-Manifest + Icons (Platzhalter, `scripts/gen-icons.mjs`), **offline-fähig** über eingebauten Service Worker (`src/service-worker.ts`, Precache + 200.html-Fallback, **kein Plugin** — Vite 8 deckt `@vite-pwa` noch nicht ab). `navigator.storage.persist()` gegen iOS-Verdrängung + DB-Health-Check mit Banner (blockierte IndexedDB, z. B. privater Modus).
- **Heute:** Schnellnotiz mit Kategorie; Briefing (letzte Schlafnacht + nächste Termine).
- **Notizen:** Liste, Suche (Inhalt + Tags), **Kategoriefilter** (Alle/Privat/Geschäftlich/Offen, reine Helper-Funktion `src/lib/notes-filter.ts`), Inline-Bearbeiten, Tags, Pin, Kategorie wechseln, Soft-Delete.
- **Termine:** anlegen / Liste anstehender / löschen + **Vorbereitungs-Tasks** (Checkliste je Termin).
- **Bucketlist:** anlegen mit **Beschreibung, Zieldatum und Kategorie** (Chips), erledigt umschalten, **Erledigte ein-/ausblenden**, löschen.
- **Schlaf:** Eintrag (Datum/Zeiten/Qualität/Notiz), **Dauer-Berechnung** (auch über Mitternacht), letzte Nächte, **Wochenschnitt** (Ø der letzten 7 Nächte) und **Bearbeiten** (Eintrag ins Formular laden, Upsert ersetzt ihn).
- **Auto-Kategorie:** lokaler Stichwort-Klassifizierer (`src/lib/classify.ts`, **kein Cloud**) schlägt für „offen"-Notizen Privat/Geschäftlich vor, Übernahme per Klick. *Gemini bewusst verworfen (Datenschutz).*
- **Qualität:** **77 Tests grün** — Datenschicht (vitest + fake-indexeddb), Sphären-Logik, Backup/Projekte und UI-Komponenten (`@testing-library/svelte` + happy-dom).
- **Dev/Git:** Multipass-VM `alltagshelfer-dev`, `scripts/vm-dev.sh`; Arbeit direkt auf `main`.

**Noch offen:** echter iPhone-Test über HTTPS (Cloudflare Tunnel) — On-Device-Verifikation des Service Workers/Offline; „Heute"-Tipp (Entschleunigen); Erinnerungen (lokale Notifications); Spracheingabe (Diktat); optional automatischer E2E-Smoke (Playwright); Push + Geräte-Sync (P6).

---

## 1. Getroffene Entscheidungen (2026-06-05)

| Frage | Entscheidung |
|---|---|
| Plattformen | iPhone + Android + Windows-Desktop |
| Auslieferung | **PWA überall** (installierbar, kein Mac, kein Apple-Account nötig) |
| Tech-Stack Client | **SvelteKit** als PWA |
| Lokale Daten | **IndexedDB via Dexie**, Schema sync-fähig |
| Spracheingabe | **OS-Diktat** je Plattform (iPhone-Diktat = on-device/offline) |
| Erinnerungen | lokal (Desktop/Android) **+ Web-Push** fürs iPhone |
| Server | **Axum, self-hosted** — nur Push + Sync + Integrations-API, **spät** (P6) |
| Schlaf-Tracking | **manuelle Eingabe** |
| Kategorisierung Privat/Geschäftlich | manuell + einfache Keyword-Regeln (lokal), KI bewusst nein |

**Warum PWA statt Tauri:** Eine native iPhone-App braucht zwingend einen Mac (Xcode) —
nicht vorhanden. Der einzige Mac-freie Weg aufs iPhone ist eine PWA. Spracheingabe
wird dadurch zu „OS-Diktat" (das iPhone-Diktat läuft on-device/offline und deckt den
Datenschutz-Wunsch ab). Folge: Rust steckt im **Server** (Axum), nicht im Client.

---

## 2. Tech-Stack

| Schicht | Wahl | Warum |
|---|---|---|
| Client | **SvelteKit** als PWA (Service Worker, installierbar) | Eine Codebasis für alle Geräte |
| Lokale Daten | **IndexedDB via Dexie** | Robust auch auf iOS-Safari; SQLite-WASM/OPFS später als Option |
| Spracheingabe | OS-Tastatur-Diktat ins Textfeld; Desktop optional Web Speech API | Offline, gratis, zuverlässig |
| Erinnerungen | Service-Worker-Notifications (Desktop/Android) + Web-Push/VAPID (iPhone) | iOS plant lokale Reminder nicht zuverlässig |
| Server (spät, P6) | **Axum, self-hosted** | Push + Sync (Last-Write-Wins) + Integrations-API |

---

## 3. Architektur

```
 iPhone-PWA    Android-PWA    Desktop-PWA      ← gleiche SvelteKit-App
     │              │              │
  (lokale Daten: IndexedDB, voll offline nutzbar)
     └──────────────┼──────────────┘
                    ↓  nur für Push + Sync (Phase 6)
        ┌────────────────────────────┐
        │  Axum-Server (self-hosted) │◄── Lern-App (TimeEntry, Phase 7)
        │  Web-Push · Sync · API     │
        └────────────────────────────┘
```

### Schlüssel-Mechaniken
- **Sync (später):** Jeder Datensatz hat `id (UUID)`, `updated_at`, `deleted_at`
  (Tombstone). Client schickt Änderungen seit letztem Sync, holt Server-Änderungen,
  Konflikt = neueres `updated_at` gewinnt (Last-Write-Wins). Für einen Einzelnutzer
  auf mehreren Geräten ausreichend — kein CRDT nötig.
- **iPhone-Erinnerung:** Server kennt den Trigger-Zeitpunkt und schickt zur Fälligkeit
  einen Web-Push → iPhone zeigt die Benachrichtigung auch bei geschlossener App
  (Voraussetzung: PWA auf Home-Bildschirm installiert, iOS 16.4+).
- **Speicher-Persistenz iOS:** `navigator.storage.persist()` anfordern, sonst kann
  Safari die Daten verdrängen.

---

## 4. Datenmodell (Kern-Entitäten)

Bereits **sync-tauglich** (UUID-IDs, `updated_at`, Soft-Delete via `deleted_at`):

- **Note** — `id, content, type(text|voice), category(privat|geschäftlich|offen), pinned, importance, project_id?, audio_path?, transcript?, created_at, updated_at, deleted_at`
- **Project** — `id, name, description?, category, archived` (bündelt Notizen zu laufenden Vorhaben)
- **Tag** + **NoteTag** (n:m)
- **Appointment** — `id, title, start_at, category(privat|geschäftlich|offen), location?, description, reminder_lead, created/updated/deleted`
- **PrepTask** — `id, appointment_id, title, done, remind_at`
- **Reminder** — `id, ref_type(note|appointment|preptask), ref_id, trigger_at, status`
- **BucketItem** — `id, title, description?, target_date?, done, category`
- **SleepEntry** — `id, date, bed_time, wake_time, quality(1–5), note?` → Dauer berechnet
- **TimeEntry** (Integrations-API) — `id, source_app, activity, category, started_at, ended_at, metadata(json)`

---

## 5. Anforderungen → Modul-Mapping

| Anforderung | Modul / Phase |
|---|---|
| App auf verschiedener Hardware | PWA überall · Sync = P6 |
| Notes Privat/Geschäftlich einordnen | Kategorie-Toggle (P1) + Keyword-Regeln |
| Notes per Tastatur | P1 |
| Spracheingabe / Transkription | OS-Diktat (P2) |
| Schnellfeld für aktuellen Tag | „Heute"-Quick-Entry (P1) |
| Overview: welche Notes wichtig | Übersicht + Pin/Wichtigkeit (P1) |
| Zukünftige Termine einfügen | calendar (P3) |
| Vorbereitung + Erinnerung dazu | PrepTask + Reminder (P3) |
| Bucketlist anzeigen/festlegen | bucketlist (P5) |
| Jeden Morgen Schlaf-Tracking zeigen | sleep manuell + Briefing (P4) |
| Entschleunigen, sanfte Tipps | briefing (P4), regelbasiert |
| Nicht vorschreiben, nur Tipps | Design-Prinzip (durchgängig) |
| Mit anderen Apps reden / Lern-App-Zeittracking | Axum-API + TimeEntry (P7) |
| „und noch weitere Sachen" | erweiterbare Modul-Struktur |

---

## 6. Roadmap (jede Phase liefert Lauffähiges, alles offline bis P6)

- **P0 – Fundament:** SvelteKit-PWA-Gerüst (installierbar, Service Worker), Dexie-DB
  mit sync-fähigem Schema, Design-Grundlage.
- **P1 – Notiz-Kern (MVP):** CRUD per Tastatur, Kategorie Privat/Geschäftlich, Tags,
  „Heute"-Schnellfeld, Übersicht mit Wichtig-Markierung, Suche. → erstes nutzbares Release.
- **P2 – Spracheingabe:** OS-Diktat-Button ins Notizfeld, Desktop optional Web Speech API.
- **P3 – Termine & Erinnerungen (lokal):** Termine, Vorbereitungs-Tasks, lokale
  Notifications (Desktop/Android). iPhone-Push kommt mit P6.
- **P4 – Briefing & Schlaf:** Schlaf manuell erfassen, Morgen-Übersicht, sanfte Tipps.
- **P5 – Bucketlist:** Verwaltung + Einbindung ins Briefing.
- **P6 – Server (Axum, self-hosted):** Web-Push (zuverlässige iPhone-Erinnerungen) +
  Geräte-Sync. → iPhone wird vollwertig.
- **P7 – Integrations-API:** `TimeEntry`-Endpoint für die Lern-App + Tracking-Dashboard.

---

## 7. Dev-Setup (VM)

Entwicklung läuft in einer dedizierten **Multipass-VM** (`alltagshelfer-dev`,
Ubuntu 24.04), um npm-Dependencies vom Host zu isolieren (Security-Praxis).

**Wichtig — Secure-Context für PWA-Tests:** Service Worker, PWA-Installation,
Web-Push und persistenter Speicher funktionieren nur über **HTTPS oder `localhost`**.
Der Zugriff auf den Dev-Server über die VM-LAN-IP per `http://` ist **kein** sicherer
Kontext → Service Worker registriert nicht. Lösung für Geräte-Tests (v. a. iPhone):
- **Option A (empfohlen):** Vite mit HTTPS + `mkcert` (lokales Root-CA, auf dem iPhone
  installiert) — keine externe Abhängigkeit.
- **Option B:** Cloudflare Tunnel (HTTPS-URL nach außen) — passt zur vorhandenen
  Cloudflare-Nutzung, schnell fürs iPhone.

---

## 8. Risiken & offene Punkte

1. **iOS-PWA-Grenzen:** Push nur bei installierter PWA; Speicher kann verdrängt werden
   → mit `navigator.storage.persist()` absichern, früh auf echtem iPhone testen.
2. **Web-Push braucht den Server** — ohne P6 sind iPhone-Reminder eingeschränkt (nur in-App).
3. **Rust-Anteil kleiner** als beim Tauri-Weg (Rust = Server, Client = TypeScript/Svelte).
4. **Auto-Kategorisierung** bewusst lokal/regelbasiert, keine Cloud-KI (Datenschutz).

---

## 9. Leitprinzipien

- **Datenschutz first:** Daten bleiben so lange wie möglich auf dem Gerät.
- **Offline-fähig:** Kernfunktionen (P0–P5) ohne Server nutzbar.
- **Nicht bevormundend:** sanfte Hinweise statt Vorgaben.
- **Sync-fest von Tag 1:** UUIDs + `updated_at` + Tombstones, damit P6 kein Umbau wird.
