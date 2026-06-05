import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
	addNote,
	allNotes,
	searchNotes,
	updateNoteContent,
	setPinned,
	setCategory,
	addTag,
	removeTag
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
