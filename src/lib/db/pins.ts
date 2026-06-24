import { db, uuid } from './db';
import type { Pin } from './types';

// Anheft-Bereich: dauerhaft angepinnte Notizen/Workflows pro Tab (`scope`).
// Sync- und backup-fähig wie alle Entitäten; der ganze Datensatz wird beim Sync
// E2E-verschlüsselt, `scope`/`content` bleiben also nie im Klartext beim Server.

// Neuen Pin anlegen. Leerer Inhalt → kein Pin (null).
export async function addPin(scope: string, content: string): Promise<Pin | null> {
	const text = content.trim();
	if (!text) return null;
	const now = Date.now();
	const pin: Pin = {
		id: uuid(),
		scope,
		content: text,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.pins.add(pin);
	return pin;
}

// Aktive Pins eines Tabs, älteste zuerst → stabile Reihenfolge beim Hinzufügen.
export async function pinsForScope(scope: string): Promise<Pin[]> {
	const arr = await db.pins.where('scope').equals(scope).toArray();
	return arr.filter((p) => p.deletedAt === null).sort((a, b) => a.createdAt - b.createdAt);
}

// Inhalt eines Pins ändern (getrimmt). Leerer Inhalt wird ignoriert.
export async function updatePin(id: string, content: string): Promise<void> {
	const text = content.trim();
	if (!text) return;
	await db.pins.update(id, { content: text, updatedAt: Date.now() });
}

// Soft-Delete: Tombstone setzen (sync-freundlich), statt physisch zu löschen.
export async function deletePin(id: string): Promise<void> {
	const now = Date.now();
	await db.pins.update(id, { deletedAt: now, updatedAt: now });
}
