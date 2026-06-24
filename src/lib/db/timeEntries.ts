import { db, uuid } from './db';
import type { Category, TimeEntry } from './types';

// Zeit-/Lern-Tracking. Datensätze kommen aus zwei Quellen (`sourceApp`):
// 'manuell' (Eingabe im Tracking-Tab) und 'pruefungstrainer' (Lern-App via Sync, P7
// Etappe 2). Das Schema (timeEntries-Tabelle) existiert seit v1 — keine Migration.
// `activity` = Fach/Modul, `metadata.note` = optionale Notiz.

export interface TimeEntryInput {
	activity: string; // Fach/Modul
	category: Category;
	startedAt: number;
	endedAt: number;
	note?: string;
	sourceApp?: string; // Default 'manuell'
}

// Neuen Eintrag anlegen. Ungültig (leeres Fach oder Ende ≤ Start) → null.
export async function addTimeEntry(input: TimeEntryInput): Promise<TimeEntry | null> {
	const activity = input.activity.trim();
	if (!activity || input.endedAt <= input.startedAt) return null;
	const now = Date.now();
	const note = input.note?.trim();
	const eintrag: TimeEntry = {
		id: uuid(),
		sourceApp: input.sourceApp ?? 'manuell',
		activity,
		category: input.category,
		startedAt: input.startedAt,
		endedAt: input.endedAt,
		metadata: note ? { note } : undefined,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.timeEntries.add(eintrag);
	return eintrag;
}

// Aktive Einträge, neueste (nach Startzeit) zuerst.
export async function allTimeEntries(): Promise<TimeEntry[]> {
	const arr = await db.timeEntries.toArray();
	return arr.filter((e) => e.deletedAt === null).sort((a, b) => b.startedAt - a.startedAt);
}

// Notiz eines Eintrags lesen (liegt in metadata, da generisch).
export function eintragNotiz(e: TimeEntry): string | undefined {
	const n = e.metadata?.note;
	return typeof n === 'string' ? n : undefined;
}

// Eintrag bearbeiten. Leeres Fach/ungültige Zeiten werden ignoriert.
export async function updateTimeEntry(
	id: string,
	patch: { activity?: string; category?: Category; startedAt?: number; endedAt?: number; note?: string }
): Promise<void> {
	const changes: Partial<TimeEntry> = { updatedAt: Date.now() };
	if (patch.activity !== undefined) {
		const a = patch.activity.trim();
		if (a) changes.activity = a;
	}
	if (patch.category !== undefined) changes.category = patch.category;
	if (patch.startedAt !== undefined) changes.startedAt = patch.startedAt;
	if (patch.endedAt !== undefined) changes.endedAt = patch.endedAt;
	if (patch.note !== undefined) {
		const n = patch.note.trim();
		changes.metadata = n ? { note: n } : undefined;
	}
	await db.timeEntries.update(id, changes);
}

// Soft-Delete (Tombstone, sync-freundlich).
export async function deleteTimeEntry(id: string): Promise<void> {
	const now = Date.now();
	await db.timeEntries.update(id, { deletedAt: now, updatedAt: now });
}
