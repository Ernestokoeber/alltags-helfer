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

Planung abgeschlossen. Aktuelle Phase: **P0 – Fundament** (siehe Roadmap in PROJEKT.md).

## Entwicklung

Läuft in einer Multipass-VM (`alltagshelfer-dev`, Ubuntu 24.04) zur Isolation der
npm-Dependencies. Details siehe PROJEKT.md, Abschnitt „Dev-Setup".
