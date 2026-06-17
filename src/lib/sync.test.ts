import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db/db';
import { addNote } from './db/notes';
import { deriveKey, randomSaltB64, encryptJson } from './crypto';
import { collectLocalChanges, encryptChange, applyRemoteChanges, DecryptError } from './sync';

beforeEach(async () => {
	await db.notes.clear();
	await db.appointments.clear();
});

describe('collectLocalChanges', () => {
	it('liefert nur Datensätze neuer als `since`, inkl. Tombstones', async () => {
		const a = await addNote({ content: 'alt' });
		const b = await addNote({ content: 'neu' });
		await db.notes.update(a.id, { updatedAt: 1000 });
		await db.notes.update(b.id, { updatedAt: 5000 });
		const c = await addNote({ content: 'weg' });
		await db.notes.update(c.id, { updatedAt: 6000, deletedAt: 6000 }); // gelöscht zählt mit

		const seit3000 = await collectLocalChanges(3000);
		expect(seit3000.map((x) => x.row.id).sort()).toEqual([b.id, c.id].sort());
	});
});

describe('encryptChange + applyRemoteChanges (E2EE-LWW)', () => {
	it('überträgt einen Datensatz verschlüsselt und wendet ihn an', async () => {
		const key = await deriveKey('pw', randomSaltB64());
		const note = await addNote({ content: 'Geheimnis' });
		const change = await encryptChange(key, 'notes', (await db.notes.get(note.id))!);
		expect(change.data).not.toContain('Geheimnis'); // Chiffrat
		expect(change.collection).toBe('notes');

		await db.notes.clear();
		expect(await applyRemoteChanges(key, [change])).toBe(1);
		expect((await db.notes.get(note.id))?.content).toBe('Geheimnis');
	});

	it('Last-Write-Wins: ältere Remote-Version übersprungen, neuere angewendet', async () => {
		const key = await deriveKey('pw', randomSaltB64());
		const note = await addNote({ content: 'lokal' });
		await db.notes.update(note.id, { updatedAt: 5000 });
		const base = (await db.notes.get(note.id))!;

		const alt = { id: note.id, collection: 'notes', updatedAt: 1000, deleted: false, data: await encryptJson(key, { ...base, content: 'remote-alt', updatedAt: 1000 }) };
		expect(await applyRemoteChanges(key, [alt])).toBe(0);
		expect((await db.notes.get(note.id))?.content).toBe('lokal');

		const neu = { id: note.id, collection: 'notes', updatedAt: 9000, deleted: false, data: await encryptJson(key, { ...base, content: 'remote-neu', updatedAt: 9000 }) };
		expect(await applyRemoteChanges(key, [neu])).toBe(1);
		expect((await db.notes.get(note.id))?.content).toBe('remote-neu');
	});

	it('falscher Schlüssel → DecryptError, keine lokale Änderung', async () => {
		const k1 = await deriveKey('richtig', randomSaltB64());
		const note = await addNote({ content: 'X' });
		const change = await encryptChange(k1, 'notes', (await db.notes.get(note.id))!);
		const k2 = await deriveKey('falsch', randomSaltB64());
		await expect(applyRemoteChanges(k2, [change])).rejects.toBeInstanceOf(DecryptError);
	});

	it('ignoriert meta/unbekannte Collections', async () => {
		const key = await deriveKey('pw', randomSaltB64());
		const meta = { id: 'salt', collection: 'meta', updatedAt: 1, deleted: false, data: 'kein-chiffrat' };
		expect(await applyRemoteChanges(key, [meta])).toBe(0);
	});
});
