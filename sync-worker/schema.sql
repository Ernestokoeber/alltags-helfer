-- Geräte-Sync: eine generische Tabelle für alle Entitäten.
-- `data` ist ein opakes, Ende-zu-Ende-verschlüsseltes Blob (Server sieht nur Chiffrat).
-- `updated_at` = Zeitstempel des Datensatzes (Client-Uhr) für Last-Write-Wins.
-- `seq` = serverseitig vergebener, monoton steigender Cursor für robustes Pull
--          (unabhängig von Client-Uhren → keine verpassten Änderungen bei Uhr-Drift).
CREATE TABLE IF NOT EXISTS records (
	id         TEXT PRIMARY KEY,
	collection TEXT NOT NULL,
	data       TEXT NOT NULL,
	updated_at INTEGER NOT NULL,
	deleted    INTEGER NOT NULL DEFAULT 0,
	seq        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_seq ON records (seq);

-- Push-Abos (payload-lose Web-Push): nur der Endpoint je Gerät, KEINE Inhalte.
CREATE TABLE IF NOT EXISTS push_subs (
	endpoint   TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL
);

-- Erinnerungs-Zeitplan: ausschließlich Fälligkeits-ZEITEN (kein Inhalt → E2EE bleibt gewahrt).
CREATE TABLE IF NOT EXISTS reminders (
	at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_at ON reminders (at);

-- Schlüssel/Wert-Zustand des Push-Crons (z. B. last_run-Cursor).
CREATE TABLE IF NOT EXISTS push_state (
	k TEXT PRIMARY KEY,
	v TEXT NOT NULL
);
