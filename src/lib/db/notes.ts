import { db, uuid } from './db';
import type { Category, Note } from './types';

// Neue Notiz anlegen (P0: nur Text). Gibt die erzeugte Notiz zurück.
export async function addNote(input: { content: string; category?: Category }): Promise<Note> {
	const now = Date.now();
	const note: Note = {
		id: uuid(),
		content: input.content.trim(),
		type: 'text',
		category: input.category ?? 'offen',
		pinned: false,
		importance: 0,
		tags: [],
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.notes.add(note);
	return note;
}

// Notizen eines Tages (lokale Zeit), neueste zuerst, ohne gelöschte.
export async function notesForDay(day: Date): Promise<Note[]> {
	const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
	const end = start + 86_400_000; // + 24 h
	const arr = await db.notes.where('createdAt').between(start, end, true, false).toArray();
	return arr.filter((n) => n.deletedAt === null).sort((a, b) => b.createdAt - a.createdAt);
}

// Soft-Delete: Tombstone setzen statt physisch löschen (sync-freundlich).
export async function softDeleteNote(id: string): Promise<void> {
	const now = Date.now();
	await db.notes.update(id, { deletedAt: now, updatedAt: now });
}
