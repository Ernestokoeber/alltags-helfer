import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
	sleepDuration,
	saveSleepEntry,
	recentSleep,
	sleepForDate,
	averageSleepMinutes
} from './sleep';
import type { SleepEntry } from './types';

// Minimaler SleepEntry-Builder für die reine averageSleepMinutes-Funktion.
function entry(bedTime: string, wakeTime: string): SleepEntry {
	return {
		id: 'x',
		date: '2026-01-01',
		bedTime,
		wakeTime,
		quality: 3,
		createdAt: 0,
		updatedAt: 0,
		deletedAt: null
	};
}

beforeEach(async () => {
	await db.sleepEntries.clear();
});

describe('Schlaf', () => {
	it('sleepDuration: Dauer in Minuten, auch über Mitternacht', () => {
		expect(sleepDuration('23:00', '07:00')).toBe(480);
		expect(sleepDuration('22:30', '06:00')).toBe(450);
		expect(sleepDuration('01:00', '09:15')).toBe(495);
	});

	it('averageSleepMinutes: Durchschnitt der Dauer, null bei leer', () => {
		expect(averageSleepMinutes([])).toBeNull();
		// (480 + 420) / 2 = 450
		expect(averageSleepMinutes([entry('23:00', '07:00'), entry('23:00', '06:00')])).toBe(450);
		// Rundung: (480 + 481) / 2 = 480.5 → 481 (wir runden kaufmännisch)
		expect(averageSleepMinutes([entry('23:00', '07:00'), entry('23:00', '07:01')])).toBe(481);
	});

	it('saveSleepEntry: upsert pro Datum (kein Duplikat)', async () => {
		await saveSleepEntry({ date: '2026-06-05', bedTime: '23:00', wakeTime: '07:00', quality: 4 });
		await saveSleepEntry({ date: '2026-06-05', bedTime: '22:30', wakeTime: '06:30', quality: 3 });

		const alle = await db.sleepEntries.where('date').equals('2026-06-05').toArray();
		expect(alle.length).toBe(1);

		const e = await sleepForDate('2026-06-05');
		expect(e?.bedTime).toBe('22:30');
		expect(e?.quality).toBe(3);
	});

	it('recentSleep: nach Datum absteigend', async () => {
		await saveSleepEntry({ date: '2026-06-03', bedTime: '23:00', wakeTime: '07:00', quality: 4 });
		await saveSleepEntry({ date: '2026-06-05', bedTime: '23:00', wakeTime: '07:00', quality: 4 });
		await saveSleepEntry({ date: '2026-06-04', bedTime: '23:00', wakeTime: '07:00', quality: 4 });

		const liste = await recentSleep();
		expect(liste.map((e) => e.date)).toEqual(['2026-06-05', '2026-06-04', '2026-06-03']);
	});
});
