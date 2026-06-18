import { db, uuid } from './db';
import type { Category, Note, Recurrence } from './types';

// Neue Notiz anlegen (P0: nur Text). Gibt die erzeugte Notiz zurück.
// dueAt setzt optional eine Aufgaben-Frist; neue Notizen sind immer offen.
export async function addNote(input: {
	content: string;
	category?: Category;
	projectId?: string;
	dueAt?: number | null;
	recurrence?: Recurrence;
	recurrenceUntil?: number | null;
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
		dueAt: input.dueAt ?? null,
		completedAt: null,
		recurrence: input.recurrence,
		recurrenceUntil: input.recurrenceUntil ?? null,
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

// Aufgaben-Frist setzen oder entfernen (null = keine Frist).
export async function setNoteDue(id: string, dueAt: number | null): Promise<void> {
	await db.notes.update(id, { dueAt, updatedAt: Date.now() });
}

// Erledigt-Status umschalten: completedAt = jetzt (erledigt) bzw. null (offen).
export async function setNoteCompleted(id: string, done: boolean): Promise<void> {
	await db.notes.update(id, { completedAt: done ? Date.now() : null, updatedAt: Date.now() });
}

// Nächste Frist einer Wiederholung (komponentenweise; behält Uhrzeit/Monatstag).
export function naechsteFrist(ms: number, rec: Recurrence): number {
	const d = new Date(ms);
	if (rec === 'daily')
		return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, d.getHours(), d.getMinutes()).getTime();
	if (rec === 'weekly')
		return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, d.getHours(), d.getMinutes()).getTime();
	return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()).getTime();
}

// Aufgabe erledigen/öffnen. Beim Erledigen einer wiederkehrenden Aufgabe (mit Frist)
// entsteht automatisch die nächste Instanz — sofern das Wiederhol-Ende nicht
// überschritten ist. Beim Wieder-Öffnen passiert nichts Zusätzliches.
export async function erledige(note: Note, done: boolean): Promise<void> {
	await setNoteCompleted(note.id, done);
	if (!done || !note.recurrence || note.dueAt == null) return;
	const next = naechsteFrist(note.dueAt, note.recurrence);
	if (note.recurrenceUntil != null && next > note.recurrenceUntil) return;
	await addNote({
		content: note.content,
		category: note.category,
		projectId: note.projectId,
		dueAt: next,
		recurrence: note.recurrence,
		recurrenceUntil: note.recurrenceUntil
	});
}

// Eine Notiz gilt als offen, solange sie nicht als erledigt markiert ist.
export function isOpen(n: Note): boolean {
	return n.completedAt == null;
}

// Aufgaben-Reihenfolge (reine Funktion, gut testbar):
//   1. offene vor erledigten
//   2. offene: mit Frist zuerst (Frist aufsteigend), dann fristlose (neueste zuerst)
//   3. erledigte: zuletzt abgeschlossene zuerst
export function sortTasks(notes: Note[]): Note[] {
	return [...notes].sort((a, b) => {
		const ao = isOpen(a);
		const bo = isOpen(b);
		if (ao !== bo) return ao ? -1 : 1;
		if (ao) {
			const ad = a.dueAt ?? null;
			const bd = b.dueAt ?? null;
			if (ad !== null && bd !== null) return ad - bd;
			if (ad !== null) return -1;
			if (bd !== null) return 1;
			return b.createdAt - a.createdAt;
		}
		return (b.completedAt ?? 0) - (a.completedAt ?? 0);
	});
}

// Offene Aufgaben projektübergreifend: Notizen mit Projektbezug oder Frist,
// die noch nicht erledigt sind — für den Desktop-Überblick. Sortiert wie
// Aufgaben (überfällige/früheste Frist zuerst, dann fristlose nach Alter).
export async function openTasks(): Promise<Note[]> {
	const arr = await db.notes.toArray();
	const tasks = arr.filter(
		(n) => n.deletedAt === null && isOpen(n) && (n.projectId != null || n.dueAt != null)
	);
	return sortTasks(tasks);
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
