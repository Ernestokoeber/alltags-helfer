import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import type { Note } from './types';
import {
	addNote,
	allNotes,
	searchNotes,
	updateNoteContent,
	setPinned,
	setCategory,
	addTag,
	removeTag,
	setNoteDue,
	setNoteCompleted,
	isOpen,
	sortTasks,
	openTasks,
	naechsteFrist,
	erledige
} from './notes';

beforeEach(async () => {
	await db.notes.clear();
});

describe('Notiz-Verwaltung', () => {
	it('allNotes: angepinnte zuerst, sonst neueste zuerst, ohne gelöschte', async () => {
		const a = await addNote({ content: 'a' });
		const b = await addNote({ content: 'b' });
		const c = await addNote({ content: 'c' });
		const base = Date.now();
		await db.notes.update(a.id, { createdAt: base - 3000 });
		await db.notes.update(b.id, { createdAt: base - 2000 });
		await db.notes.update(c.id, { createdAt: base - 1000 });
		await setPinned(a.id, true); // ältestes, aber angepinnt -> ganz oben

		const liste = await allNotes();
		expect(liste.map((n) => n.content)).toEqual(['a', 'c', 'b']);
	});

	it('searchNotes: findet über Inhalt und Tags (case-insensitive)', async () => {
		const x = await addNote({ content: 'Einkaufsliste Milch' });
		await addNote({ content: 'Anruf beim Arzt' });
		await addTag(x.id, 'Haushalt');

		expect((await searchNotes('milch')).map((n) => n.content)).toEqual(['Einkaufsliste Milch']);
		expect((await searchNotes('haushalt')).map((n) => n.content)).toEqual(['Einkaufsliste Milch']);
		expect((await searchNotes('')).length).toBe(2);
	});

	it('updateNoteContent: ändert Inhalt (getrimmt) und bumpt updatedAt', async () => {
		const n = await addNote({ content: 'alt' });
		const vorher = (await db.notes.get(n.id))!.updatedAt;
		await new Promise((r) => setTimeout(r, 3));
		await updateNoteContent(n.id, '  neu  ');

		const nachher = await db.notes.get(n.id);
		expect(nachher?.content).toBe('neu');
		expect(nachher!.updatedAt).toBeGreaterThan(vorher);
	});

	it('setCategory: ändert die Kategorie', async () => {
		const n = await addNote({ content: 'x', category: 'offen' });
		await setCategory(n.id, 'geschaeftlich');
		expect((await db.notes.get(n.id))?.category).toBe('geschaeftlich');
	});

	it('Tags: hinzufügen (dedupliziert, lowercase) und entfernen', async () => {
		const n = await addNote({ content: 'x' });
		await addTag(n.id, 'Wichtig');
		await addTag(n.id, 'wichtig'); // Duplikat per Groß-/Kleinschreibung
		await addTag(n.id, 'Projekt');
		expect((await db.notes.get(n.id))?.tags).toEqual(['wichtig', 'projekt']);

		await removeTag(n.id, 'wichtig');
		expect((await db.notes.get(n.id))?.tags).toEqual(['projekt']);
	});

	it('setPinned: schaltet pinned um', async () => {
		const n = await addNote({ content: 'x' });
		expect((await db.notes.get(n.id))?.pinned).toBe(false);
		await setPinned(n.id, true);
		expect((await db.notes.get(n.id))?.pinned).toBe(true);
	});
});

describe('Notizen als Aufgaben (Frist & Erledigt)', () => {
	it('addNote übernimmt eine Frist und ist anfangs offen', async () => {
		const frist = Date.now() + 86_400_000;
		const n = await addNote({ content: 'Aufgabe mit Frist', dueAt: frist });
		expect(n.dueAt).toBe(frist);
		expect(n.completedAt).toBeNull();
		expect(isOpen(n)).toBe(true);
	});

	it('addNote ohne Frist: dueAt = null, completedAt = null', async () => {
		const n = await addNote({ content: 'ohne Frist' });
		expect(n.dueAt).toBeNull();
		expect(n.completedAt).toBeNull();
	});

	it('setNoteDue setzt und entfernt die Frist', async () => {
		const n = await addNote({ content: 'x' });
		const frist = Date.now() + 86_400_000;
		await setNoteDue(n.id, frist);
		expect((await db.notes.get(n.id))?.dueAt).toBe(frist);
		await setNoteDue(n.id, null);
		expect((await db.notes.get(n.id))?.dueAt).toBeNull();
	});

	it('setNoteCompleted markiert erledigt und wieder offen', async () => {
		const n = await addNote({ content: 'x' });
		await setNoteCompleted(n.id, true);
		const erledigt = await db.notes.get(n.id);
		expect(typeof erledigt?.completedAt).toBe('number');
		expect(isOpen(erledigt!)).toBe(false);

		await setNoteCompleted(n.id, false);
		const offen = await db.notes.get(n.id);
		expect(offen?.completedAt).toBeNull();
		expect(isOpen(offen!)).toBe(true);
	});

	it('sortTasks: offene vor erledigten; offene nach Frist; erledigte zuletzt', () => {
		const base = 1_000_000_000_000;
		const mk = (over: Partial<Note> & { id: string }): Note => ({
			id: over.id,
			content: '',
			type: 'text',
			category: 'offen',
			pinned: false,
			importance: 0,
			tags: [],
			createdAt: over.createdAt ?? base,
			updatedAt: base,
			deletedAt: null,
			dueAt: over.dueAt ?? null,
			completedAt: over.completedAt ?? null
		});
		const fristFrueh = mk({ id: 'frueh', dueAt: base + 1000 });
		const fristSpaet = mk({ id: 'spaet', dueAt: base + 5000 });
		const ohneFrist = mk({ id: 'ohne', createdAt: base + 100 });
		const erledigt = mk({ id: 'done', completedAt: base + 2000 });
		const erledigtNeuer = mk({ id: 'done2', completedAt: base + 9000 });

		const sortiert = sortTasks([erledigt, ohneFrist, fristSpaet, erledigtNeuer, fristFrueh]);
		expect(sortiert.map((n) => n.id)).toEqual(['frueh', 'spaet', 'ohne', 'done2', 'done']);
	});

	it('openTasks: nur offene Aufgaben (Projekt oder Frist), sortiert, ohne erledigte/gelöschte', async () => {
		const base = Date.now();
		await addNote({ content: 'Projektaufgabe', projectId: 'p1' }); // fristlos, aber Projekt
		await addNote({ content: 'Frist früh', dueAt: base + 1000 });
		await addNote({ content: 'Frist spät', dueAt: base + 5000 });
		await addNote({ content: 'lose Notiz' }); // kein Projekt, keine Frist -> keine Aufgabe
		const erledigt = await addNote({ content: 'erledigt', projectId: 'p1' });
		await setNoteCompleted(erledigt.id, true);
		const geloescht = await addNote({ content: 'gelöscht', dueAt: base + 2000 });
		await db.notes.update(geloescht.id, { deletedAt: Date.now() });

		const inhalte = (await openTasks()).map((n) => n.content);
		// Fristen aufsteigend zuerst, dann fristlose Projektaufgabe.
		expect(inhalte).toEqual(['Frist früh', 'Frist spät', 'Projektaufgabe']);
		expect(inhalte).not.toContain('lose Notiz');
		expect(inhalte).not.toContain('erledigt');
		expect(inhalte).not.toContain('gelöscht');
	});
});

describe('Wiederkehrende Aufgaben', () => {
	it('naechsteFrist: rückt täglich/wöchentlich/monatlich vor', () => {
		const d = new Date(2026, 0, 15, 9, 30).getTime(); // 15.01.2026
		expect(new Date(naechsteFrist(d, 'daily')).getDate()).toBe(16);
		expect(new Date(naechsteFrist(d, 'weekly')).getDate()).toBe(22);
		expect(new Date(naechsteFrist(d, 'monthly')).getMonth()).toBe(1); // Februar
	});

	it('erledige: erzeugt beim Erledigen die nächste Instanz (mit Frist + Wiederholung)', async () => {
		const due = new Date(2026, 0, 15, 9, 0).getTime();
		const n = await addNote({ content: 'Müll raus', dueAt: due, recurrence: 'weekly', projectId: 'p1' });
		await erledige(n, true);

		const offen = (await db.notes.toArray()).filter((x) => x.completedAt == null);
		expect(offen).toHaveLength(1);
		expect(offen[0].content).toBe('Müll raus');
		expect(offen[0].dueAt).toBe(naechsteFrist(due, 'weekly'));
		expect(offen[0].projectId).toBe('p1');
	});

	it('erledige: einmalige Aufgabe erzeugt nichts, Wieder-Öffnen auch nicht', async () => {
		const n = await addNote({ content: 'einmal', dueAt: Date.now() });
		await erledige(n, true);
		expect((await db.notes.toArray()).length).toBe(1);
		await erledige({ ...n, recurrence: 'daily' }, false); // done=false → keine Instanz
		expect((await db.notes.toArray()).length).toBe(1);
	});

	it('erledige: respektiert recurrenceUntil (keine Instanz nach Ende)', async () => {
		const due = new Date(2026, 0, 15, 9, 0).getTime();
		const n = await addNote({ content: 'x', dueAt: due, recurrence: 'daily', recurrenceUntil: due });
		await erledige(n, true);
		expect((await db.notes.toArray()).length).toBe(1); // nächste wäre nach until → keine
	});
});
