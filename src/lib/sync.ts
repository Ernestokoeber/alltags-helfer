// Geräte-Sync-Client: sammelt lokale Änderungen, verschlüsselt sie Ende-zu-Ende
// und gleicht sie über den Cloudflare-Worker (D1) mit anderen Geräten ab.
// Konfliktregel: Last-Write-Wins über `updatedAt` (wie das Backup-Feature).

import { db } from './db/db';
import type { SyncMeta } from './db/types';
import { deriveKey, encryptJson, decryptJson, randomSaltB64 } from './crypto';

export const SYNC_URL = 'https://alltags-helfer-sync.ekoeber.workers.dev';

// Synchronisierte Tabellen = alle Nutzdaten (deckungsgleich mit dem Backup-Feature).
export const SYNC_TABLES = [
	'notes',
	'tags',
	'appointments',
	'prepTasks',
	'reminders',
	'timeEntries',
	'projects'
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

// Eine Übertragungseinheit. `data` ist E2EE-Chiffrat des vollständigen Datensatzes;
// `id`/`collection`/`updatedAt`/`deleted` bleiben Klartext (nur für Merge & Cursor).
export type Change = {
	id: string;
	collection: string;
	data: string;
	updatedAt: number;
	deleted: boolean;
};
export type SyncRequest = { since: number; changes: Change[] };
export type SyncResponse = { cursor: number; changes: Change[] };
export type Transport = (req: SyncRequest) => Promise<SyncResponse>;

export class SyncError extends Error {}
export class DecryptError extends SyncError {
	constructor() {
		super('Entschlüsselung fehlgeschlagen – falsches E2EE-Passwort?');
	}
}

// HTTP-Transport gegen den Worker (Bearer = Sync-Code).
export function httpTransport(code: string, url: string = SYNC_URL): Transport {
	return async (req) => {
		const res = await fetch(`${url}/sync`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${code}` },
			body: JSON.stringify(req)
		});
		if (!res.ok) {
			throw new SyncError(res.status === 401 ? 'Falscher Sync-Code.' : `Server-Fehler ${res.status}.`);
		}
		return (await res.json()) as SyncResponse;
	};
}

// Lokale Änderungen seit `since` (updatedAt) über alle Sync-Tabellen einsammeln.
// Tombstones (gelöschte Einträge) sind inklusive — sie haben ein updatedAt.
export async function collectLocalChanges(
	since: number
): Promise<{ collection: SyncTable; row: SyncMeta }[]> {
	const out: { collection: SyncTable; row: SyncMeta }[] = [];
	for (const t of SYNC_TABLES) {
		const rows = (await db.table(t).where('updatedAt').above(since).toArray()) as SyncMeta[];
		for (const row of rows) out.push({ collection: t, row });
	}
	return out;
}

// Vollen Datensatz verschlüsseln → Change (Metadaten bleiben für den Merge Klartext).
export async function encryptChange(
	key: CryptoKey,
	collection: string,
	row: SyncMeta
): Promise<Change> {
	return {
		id: row.id,
		collection,
		updatedAt: row.updatedAt,
		deleted: row.deletedAt != null,
		data: await encryptJson(key, row)
	};
}

// Server-Deltas anwenden: entschlüsseln + Last-Write-Wins in die lokale DB.
// 'meta'/unbekannte Collections werden übersprungen. Wirft DecryptError bei
// falschem Passwort (vor jeder lokalen Änderung → keine kaputten Daten).
export async function applyRemoteChanges(key: CryptoKey, changes: Change[]): Promise<number> {
	let applied = 0;
	for (const c of changes) {
		if (!SYNC_TABLES.includes(c.collection as SyncTable)) continue; // 'meta' & Unbekanntes
		let row: SyncMeta;
		try {
			row = (await decryptJson(key, c.data)) as SyncMeta;
		} catch {
			throw new DecryptError();
		}
		if (typeof row?.id !== 'string' || typeof row?.updatedAt !== 'number') continue;
		const existing = (await db.table(c.collection).get(row.id)) as SyncMeta | undefined;
		if (!existing || row.updatedAt > existing.updatedAt) {
			await db.table(c.collection).put(row);
			applied++;
		}
	}
	return applied;
}

// --- Konfiguration & Cursor (localStorage) ---
const LS = {
	code: 'sync.code',
	pass: 'sync.pass',
	salt: 'sync.salt',
	pull: 'sync.pullCursor',
	push: 'sync.pushSince',
	last: 'sync.lastAt'
};

function lsGet(k: string): string | null {
	return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
}
function lsSet(k: string, v: string): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
}
function lsDel(k: string): void {
	if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
}

export type SyncConfig = { code: string; passphrase: string };

export function loadConfig(): SyncConfig {
	return { code: lsGet(LS.code) ?? '', passphrase: lsGet(LS.pass) ?? '' };
}

// Speichert Zugangsdaten. Bei (Neu-)Einrichtung Cursor + Salt zurücksetzen, damit
// mit den neuen Daten ein sauberer Voll-Sync läuft.
export function saveConfig(cfg: SyncConfig): void {
	// Beide getrimmt: versehentliche Leerzeichen (v. a. Handy-Tastaturen) würden
	// sonst zu einem anderen Schlüssel und damit zu „falschem Passwort" führen.
	lsSet(LS.code, cfg.code.trim());
	lsSet(LS.pass, cfg.passphrase.trim());
	lsDel(LS.salt);
	lsDel(LS.pull);
	lsDel(LS.push);
}

export function isConfigured(): boolean {
	const c = loadConfig();
	return c.code.length > 0 && c.passphrase.length > 0;
}

export function lastSyncAt(): number | null {
	const v = lsGet(LS.last);
	return v ? Number(v) : null;
}

const META = 'meta';

// Salt sicherstellen + Schlüssel ableiten. Beim ersten Mal fragt der Client den
// Server nach Salt/Verifier: existiert ein Verifier, wird das Passwort sofort
// geprüft (DecryptError bei falschem Passwort), sonst werden Salt + Verifier angelegt.
async function ensureKey(tx: Transport, passphrase: string, now: number): Promise<CryptoKey> {
	const known = lsGet(LS.salt);
	if (known) return deriveKey(passphrase, known);

	const pull = await tx({ since: 0, changes: [] });
	const saltRec = pull.changes.find((c) => c.collection === META && c.id === 'salt');
	const salt = saltRec ? saltRec.data : randomSaltB64();
	const key = await deriveKey(passphrase, salt);

	const verifyRec = pull.changes.find((c) => c.collection === META && c.id === 'verify');
	if (verifyRec) {
		try {
			await decryptJson(key, verifyRec.data);
		} catch {
			throw new DecryptError(); // Passwort passt nicht zu vorhandenen Daten
		}
	}

	const toPush: Change[] = [];
	if (!saltRec) {
		toPush.push({ id: 'salt', collection: META, data: salt, updatedAt: now, deleted: false });
	}
	if (!verifyRec) {
		toPush.push({
			id: 'verify',
			collection: META,
			data: await encryptJson(key, { v: 1 }),
			updatedAt: now,
			deleted: false
		});
	}
	if (toPush.length) await tx({ since: pull.cursor, changes: toPush });

	lsSet(LS.salt, salt);
	return key;
}

export type SyncResult = { gepusht: number; angewendet: number };

// Ein vollständiger Sync-Durchlauf: Schlüssel sicherstellen → lokale Änderungen
// verschlüsselt pushen + Server-Deltas pullen/anwenden → Cursor fortschreiben.
// `transport`/`now` injizierbar für Tests.
export async function runSync(transport?: Transport, now: number = Date.now()): Promise<SyncResult> {
	const cfg = loadConfig();
	if (!cfg.code || !cfg.passphrase) throw new SyncError('Sync ist nicht eingerichtet.');
	const tx = transport ?? httpTransport(cfg.code);

	const key = await ensureKey(tx, cfg.passphrase, now);

	const pushSince = Number(lsGet(LS.push) ?? '0');
	const pullCursor = Number(lsGet(LS.pull) ?? '0');

	const local = await collectLocalChanges(pushSince);
	const changes: Change[] = [];
	for (const { collection, row } of local) changes.push(await encryptChange(key, collection, row));

	const resp = await tx({ since: pullCursor, changes });
	const angewendet = await applyRemoteChanges(key, resp.changes);

	lsSet(LS.pull, String(resp.cursor));
	lsSet(LS.push, String(now));
	lsSet(LS.last, String(now));
	return { gepusht: changes.length, angewendet };
}
