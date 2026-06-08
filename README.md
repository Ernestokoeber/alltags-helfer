# Alltags-Helfer

Ein **local-first Second-Brain & Daily-Planner** als PWA (iPhone + Android + Desktop):
Notizen (Text + Sprache), Termine mit Vorbereitung & Erinnerung, Bucketlist,
Schlaf-Tracking und ein sanftes Morgen-Briefing.

> Den vollständigen Plan, die Architektur und die Roadmap findest du in
> **[PROJEKT.md](./PROJEKT.md)**.

## Stack (geplant)

- **Client:** SvelteKit als PWA, lokale Daten via IndexedDB (Dexie)
- **Spracheingabe:** OS-Diktat (on-device)
- **Server (spät):** Axum (Rust), self-hosted — Web-Push + Geräte-Sync

## Status

In Umsetzung — alle 5 Tabs funktional, **50 Tests grün**. Changelog/Details in
**[PROJEKT.md](./PROJEKT.md)** (Abschnitt „Umgesetzt").

**Funktionen:** Heute (Schnellnotiz + Briefing), Notizen (Suche/Kategoriefilter/
Bearbeiten/Tags/Pin/Kategorie), Termine (+ Vorbereitungs-Tasks), Bucketlist
(Beschreibung/Zieldatum/Kategorie, Erledigte ausblendbar), Schlaf (Dauer +
Wochenschnitt + Bearbeiten), lokale Auto-Kategorie für „offen"-Notizen (kein Cloud).

## Entwicklung

Läuft in einer Multipass-VM (`alltagshelfer-dev`, Ubuntu 24.04) zur Isolation der
npm-Dependencies.

**Arbeitsteilung (wichtig unter Windows):** Der Quellcode (`src/`, Config) liegt auf
dem Host und wird dort editiert. Die VM hält nur die generierten Ordner
(`node_modules`, `.svelte-kit`, `build`); `node_modules` ist VM-lokal gebunden
(schnell + umgeht die sshfs-Grenzen des Mounts). Vom VM erzeugte Dateien sind auf dem
Host schreibgeschützt — daher **niemals Quellcode in der VM erzeugen**.

**Dev-Server starten** (in der VM):

```bash
multipass exec alltagshelfer-dev -- bash /home/ubuntu/alltags-helfer/scripts/vm-dev.sh
```

Das Skript stellt den `node_modules`-Bind sicher (nötig nach jedem VM-Neustart) und
startet Vite. Hinweis: PWA-Features (Service Worker, Installation, Push) brauchen
HTTPS oder `localhost` — fürs Testen auf echten Geräten später via `mkcert` oder
Cloudflare-Tunnel (siehe PROJEKT.md).
