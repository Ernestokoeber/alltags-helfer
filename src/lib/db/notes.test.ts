import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addNote, notesForDay, softDeleteNote } from './notes';

beforeEach(async () => {
	await db.notes.clear();
});

describe('Notiz-Datenschicht', () => {
	it('legt eine Notiz mit korrekten Feldern an (und trimmt den Inhalt)', async () => {
		const note = await addNote({ content: '  Hallo Welt  ', category: 'privat' });
		expect(note.id).toBeTruthy();
		expect(note.content).toBe('Hallo Welt');
		expect(note.category).toBe('privat');
		expect(note.type).toBe('text');
		expect(note.deletedAt).toBeNull();

		const ausDb = await db.notes.get(note.id);
		expect(ausDb?.content).toBe('Hallo Welt');
	});

	it('nutzt Kategorie "offen" als Standard', async () => {
		const note = await addNote({ content: 'ohne Kategorie' });
		expect(note.category).toBe('offen');
	});

	it('listet heutige Notizen, neueste zuerst', async () => {
		const a = await addNote({ content: 'aelter' });
		const b = await addNote({ content: 'neuer' });
		const base = Date.now();
		await db.notes.update(a.id, { createdAt: base - 1000 });
		await db.notes.update(b.id, { createdAt: base });

		const liste = await notesForDay(new Date());
		expect(liste.map((n) => n.content)).toEqual(['neuer', 'aelter']);
	});

	it('blendet Notizen anderer Tage aus', async () => {
		const heutig = await addNote({ content: 'heute' });
		const gestern = Date.now() - 24 * 60 * 60 * 1000;
		await db.notes.update(heutig.id, { createdAt: gestern });

		const liste = await notesForDay(new Date());
		expect(liste).toHaveLength(0);
	});

	it('Soft-Delete setzt einen Tombstone und entfernt aus der Tagesliste', async () => {
		const note = await addNote({ content: 'weg damit' });
		await softDeleteNote(note.id);

		const ausDb = await db.notes.get(note.id);
		expect(ausDb).toBeDefined(); // Datensatz bleibt erhalten ...
		expect(ausDb?.deletedAt).not.toBeNull(); // ... ist aber als gelöscht markiert

		const liste = await notesForDay(new Date());
		expect(liste.find((n) => n.id === note.id)).toBeUndefined();
	});
});
