import { db } from './db';
import type { SyncMeta } from './types';

// Datensicherung: alle Tabellen als JSON exportieren und auf einem anderen
// Gerät wieder einspielen. Überbrückt den fehlenden Geräte-Sync (P6) — der
// Import nutzt dieselbe Konfliktregel wie der spätere Sync: Last-Write-Wins
// über `updatedAt`. Tombstones (gelöschte Einträge) werden mitgesichert,
// damit Löschungen den Umzug überleben.

export const BACKUP_APP = 'alltags-helfer';
export const BACKUP_SCHEMA = 5; // entspricht der Dexie-Schema-Version (v5: Bucket/Schlaf entfernt)

const TABLES = [
	'notes',
	'tags',
	'appointments',
	'prepTasks',
	'reminders',
	'timeEntries',
	'projects'
] as const;
type TableName = (typeof TABLES)[number];

export interface Backup {
	app: typeof BACKUP_APP;
	schema: number;
	exportedAt: number; // Unix-ms
	data: Partial<Record<TableName, SyncMeta[]>>;
}

export async function exportBackup(): Promise<Backup> {
	const data: Backup['data'] = {};
	for (const t of TABLES) {
		data[t] = (await db.table(t).toArray()) as SyncMeta[];
	}
	return { app: BACKUP_APP, schema: BACKUP_SCHEMA, exportedAt: Date.now(), data };
}

// Strukturprüfung einer eingelesenen Datei (z. B. nach JSON.parse).
export function isBackup(x: unknown): x is Backup {
	if (typeof x !== 'object' || x === null) return false;
	const b = x as Record<string, unknown>;
	return (
		b.app === BACKUP_APP &&
		typeof b.schema === 'number' &&
		typeof b.data === 'object' &&
		b.data !== null
	);
}

export interface ImportResult {
	added: number; // neu angelegt
	updated: number; // Sicherung war neuer → überschrieben
	skipped: number; // lokal neuer/identisch oder Datensatz unbrauchbar
}

export async function importBackup(input: unknown): Promise<ImportResult> {
	if (!isBackup(input)) {
		throw new Error('Keine gültige Alltags-Helfer-Sicherung.');
	}
	if (input.schema > BACKUP_SCHEMA) {
		throw new Error('Die Sicherung stammt aus einer neueren App-Version — bitte erst App aktualisieren.');
	}

	const result: ImportResult = { added: 0, updated: 0, skipped: 0 };
	for (const t of TABLES) {
		const rows = input.data[t];
		if (!Array.isArray(rows)) continue;
		for (const row of rows) {
			// Mindestanforderung je Datensatz: UUID + updatedAt (sync-Schema).
			if (
				typeof row !== 'object' ||
				row === null ||
				typeof row.id !== 'string' ||
				typeof row.updatedAt !== 'number'
			) {
				result.skipped++;
				continue;
			}
			// Sicherungen aus Schema v1: Termine hatten noch keine Kategorie.
			if (t === 'appointments') {
				(row as SyncMeta & { category?: string }).category ??= 'offen';
			}
			const existing = (await db.table(t).get(row.id)) as SyncMeta | undefined;
			if (!existing) {
				await db.table(t).add(row);
				result.added++;
			} else if (row.updatedAt > existing.updatedAt) {
				await db.table(t).put(row);
				result.updated++;
			} else {
				result.skipped++;
			}
		}
	}
	return result;
}
