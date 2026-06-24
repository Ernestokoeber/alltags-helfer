import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
	addTimeEntry,
	allTimeEntries,
	updateTimeEntry,
	deleteTimeEntry,
	eintragNotiz
} from './timeEntries';

const t0 = new Date(2026, 5, 24, 10, 0, 0).getTime();

beforeEach(async () => {
	await db.timeEntries.clear();
});

describe('Zeit-Tracking (timeEntries)', () => {
	it('addTimeEntry: legt an, Default-Quelle "manuell", Notiz in metadata', async () => {
		const e = await addTimeEntry({
			activity: ' Security+ ',
			category: 'privat',
			startedAt: t0,
			endedAt: t0 + 60 * 60_000,
			note: '  Kapitel 3  '
		});
		expect(e?.activity).toBe('Security+');
		expect(e?.sourceApp).toBe('manuell');
		expect(eintragNotiz(e!)).toBe('Kapitel 3');
	});

	it('addTimeEntry: leeres Fach oder Ende ≤ Start → null', async () => {
		expect(await addTimeEntry({ activity: '  ', category: 'privat', startedAt: t0, endedAt: t0 + 1 })).toBeNull();
		expect(await addTimeEntry({ activity: 'AP1', category: 'privat', startedAt: t0, endedAt: t0 })).toBeNull();
	});

	it('allTimeEntries: neueste (Startzeit) zuerst, ohne gelöschte', async () => {
		await addTimeEntry({ activity: 'AP1', category: 'privat', startedAt: t0, endedAt: t0 + 1000 });
		await addTimeEntry({
			activity: 'AP2',
			category: 'privat',
			startedAt: t0 + 86_400_000,
			endedAt: t0 + 86_400_000 + 1000
		});
		const reihenfolge = (await allTimeEntries()).map((e) => e.activity);
		expect(reihenfolge).toEqual(['AP2', 'AP1']);
	});

	it('updateTimeEntry: Fach/Notiz ändern; leeres Fach ignoriert', async () => {
		const e = await addTimeEntry({ activity: 'AP1', category: 'privat', startedAt: t0, endedAt: t0 + 1000 });
		await updateTimeEntry(e!.id, { activity: 'Cloud+', note: 'neu' });
		let g = await db.timeEntries.get(e!.id);
		expect(g?.activity).toBe('Cloud+');
		expect(eintragNotiz(g!)).toBe('neu');

		await updateTimeEntry(e!.id, { activity: '   ' });
		g = await db.timeEntries.get(e!.id);
		expect(g?.activity).toBe('Cloud+'); // unverändert
	});

	it('deleteTimeEntry: soft-delete', async () => {
		const e = await addTimeEntry({ activity: 'AP1', category: 'privat', startedAt: t0, endedAt: t0 + 1000 });
		await deleteTimeEntry(e!.id);
		expect((await allTimeEntries()).length).toBe(0);
		expect((await db.timeEntries.get(e!.id))?.deletedAt).not.toBeNull();
	});
});
