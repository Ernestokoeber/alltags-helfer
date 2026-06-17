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
