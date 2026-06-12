import { db, uuid } from './db';
import type { Category, Note } from './types';

// Neue Notiz anlegen (P0: nur Text). Gibt die erzeugte Notiz zurück.
export async function addNote(input: {
	content: string;
	category?: Category;
	projectId?: string;
}): Promise<Note> {
	const now = Date.now();
	const note: Note = {
		id: uuid(),
		content: input.content.trim(),
		type: 'text',
		category: input.category ?? 'offen',
		pinned: false,
		importance: 0,
		tags: [],
		projectId: input.projectId,
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

// Alle aktiven Notizen: angepinnte zuerst, sonst neueste zuerst.
// (deletedAt=null lässt sich in IndexedDB nicht indexieren, daher in JS gefiltert.)
export async function allNotes(): Promise<Note[]> {
	const arr = await db.notes.toArray();
	return arr
		.filter((n) => n.deletedAt === null)
		.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
}

// Volltextsuche über Inhalt und Tags (case-insensitive). Leere Query = alle.
export async function searchNotes(query: string): Promise<Note[]> {
	const q = query.trim().toLowerCase();
	const alle = await allNotes();
	if (!q) return alle;
	return alle.filter(
		(n) => n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q))
	);
}

// Inhalt einer Notiz ändern (getrimmt), updatedAt aktualisieren.
export async function updateNoteContent(id: string, content: string): Promise<void> {
	await db.notes.update(id, { content: content.trim(), updatedAt: Date.now() });
}

// Pin-Status setzen.
export async function setPinned(id: string, pinned: boolean): Promise<void> {
	await db.notes.update(id, { pinned, updatedAt: Date.now() });
}

// Kategorie ändern (Privat/Geschäftlich/Offen).
export async function setCategory(id: string, category: Category): Promise<void> {
	await db.notes.update(id, { category, updatedAt: Date.now() });
}

// Tag hinzufügen (kleingeschrieben, dedupliziert).
export async function addTag(id: string, tag: string): Promise<void> {
	const t = tag.trim().toLowerCase();
	if (!t) return;
	const note = await db.notes.get(id);
	if (!note || note.tags.includes(t)) return;
	await db.notes.update(id, { tags: [...note.tags, t], updatedAt: Date.now() });
}

// Tag entfernen.
export async function removeTag(id: string, tag: string): Promise<void> {
	const note = await db.notes.get(id);
	if (!note) return;
	const t = tag.trim().toLowerCase();
	await db.notes.update(id, { tags: note.tags.filter((x) => x !== t), updatedAt: Date.now() });
}
