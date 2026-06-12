import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addNote, softDeleteNote } from './notes';
import { addAppointment } from './appointments';
import { saveSleepEntry } from './sleep';
import { exportBackup, importBackup, isBackup, BACKUP_APP, BACKUP_SCHEMA } from './backup';

beforeEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
});

describe('exportBackup', () => {
	it('enthält alle Tabellen inklusive Tombstones', async () => {
		await addNote({ content: 'bleibt', category: 'privat' });
		const weg = await addNote({ content: 'gelöscht' });
		await softDeleteNote(weg.id);
		await addAppointment({ title: 'Termin', startAt: Date.now(), category: 'geschaeftlich' });

		const b = await exportBackup();
		expect(b.app).toBe(BACKUP_APP);
		expect(b.schema).toBe(BACKUP_SCHEMA);
		expect(b.data.notes).toHaveLength(2); // aktiv + Tombstone
		expect(b.data.notes?.find((n) => n.id === weg.id)?.deletedAt).not.toBeNull();
		expect(b.data.appointments).toHaveLength(1);
	});
});

describe('importBackup', () => {
	it('Roundtrip: Export → leere DB → Import stellt alles wieder her', async () => {
		await addNote({ content: 'Notiz', category: 'privat' });
		await addAppointment({ title: 'Zahnarzt', startAt: Date.now() + 1000 });
		await saveSleepEntry({ date: '2026-06-10', bedTime: '23:00', wakeTime: '07:00', quality: 4 });

		const b = JSON.parse(JSON.stringify(await exportBackup())); // wie aus Datei gelesen
		await Promise.all(db.tables.map((t) => t.clear()));

		const r = await importBackup(b);
		expect(r.added).toBe(3);
		expect(r.updated).toBe(0);
		expect(await db.notes.count()).toBe(1);
		expect(await db.appointments.count()).toBe(1);
		expect(await db.sleepEntries.count()).toBe(1);
	});

	it('Last-Write-Wins: neuere Sicherung überschreibt, ältere wird übersprungen', async () => {
		const n = await addNote({ content: 'lokal' });
		const b = await exportBackup();

		// Sicherungs-Kopie neuer machen → überschreibt lokal.
		const neuer = JSON.parse(JSON.stringify(b));
		neuer.data.notes[0].content = 'aus Sicherung';
		neuer.data.notes[0].updatedAt = n.updatedAt + 1000;
		let r = await importBackup(neuer);
		expect(r.updated).toBe(1);
		expect((await db.notes.get(n.id))?.content).toBe('aus Sicherung');

		// Alte Original-Sicherung erneut einspielen → lokal ist neuer, bleibt.
		r = await importBackup(JSON.parse(JSON.stringify(b)));
		expect(r.skipped).toBe(1);
		expect((await db.notes.get(n.id))?.content).toBe('aus Sicherung');
	});

	it('ergänzt bei v1-Sicherungen die fehlende Termin-Kategorie mit "offen"', async () => {
		const alt = {
			app: BACKUP_APP,
			schema: 1,
			exportedAt: Date.now(),
			data: {
				appointments: [
					{
						id: 'a1',
						title: 'Alt-Termin',
						startAt: Date.now(),
						createdAt: 1,
						updatedAt: 1,
						deletedAt: null
					}
				]
			}
		};
		await importBackup(alt);
		expect((await db.appointments.get('a1'))?.category).toBe('offen');
	});

	it('weist ungültige Dateien und neuere Schema-Versionen ab', async () => {
		await expect(importBackup({ irgendwas: true })).rejects.toThrow(/gültige/);
		await expect(
			importBackup({ app: BACKUP_APP, schema: BACKUP_SCHEMA + 1, exportedAt: 0, data: {} })
		).rejects.toThrow(/neueren App-Version/);
		expect(isBackup('kein objekt')).toBe(false);
	});

	it('zählt unbrauchbare Datensätze als übersprungen', async () => {
		const r = await importBackup({
			app: BACKUP_APP,
			schema: BACKUP_SCHEMA,
			exportedAt: Date.now(),
			data: { notes: [{ ohneId: true }] }
		});
		expect(r).toEqual({ added: 0, updated: 0, skipped: 1 });
		expect(await db.notes.count()).toBe(0);
	});
});
