import { describe, expect, it } from 'vitest';
import { monatsTage, tagKey, gruppiereNachTag, terminInstanzen } from './calendar';
import type { Appointment, Recurrence } from './db/types';

const DAY = 86_400_000;

function mk(id: string, startAt: number, recurrence?: Recurrence, recurrenceUntil?: number): Appointment {
	return {
		id,
		title: id,
		startAt,
		category: 'offen',
		createdAt: 0,
		updatedAt: 0,
		deletedAt: null,
		recurrence,
		recurrenceUntil: recurrenceUntil ?? null
	};
}

describe('monatsTage / tagKey', () => {
	it('liefert 42 Tage, beginnend an einem Montag, inkl. des Monatsersten', () => {
		const tage = monatsTage(2026, 5); // Juni 2026
		expect(tage).toHaveLength(42);
		expect(tage[0].getDay()).toBe(1); // Montag
		expect(tage.some((d) => d.getMonth() === 5 && d.getDate() === 1)).toBe(true);
	});

	it('tagKey: lokaler Schlüssel YYYY-MM-DD', () => {
		expect(tagKey(new Date(2026, 5, 7))).toBe('2026-06-07');
	});
});

describe('gruppiereNachTag', () => {
	it('gruppiert je Tag, sortiert aufsteigend, ignoriert gelöschte', () => {
		const t = new Date(2026, 5, 10, 0, 0).getTime();
		const spaet = mk('spaet', t + 15 * 3_600_000);
		const frueh = mk('frueh', t + 8 * 3_600_000);
		const weg = { ...mk('weg', t + 9 * 3_600_000), deletedAt: 1 };
		const map = gruppiereNachTag([spaet, frueh, weg]);
		expect(map.get('2026-06-10')!.map((x) => x.id)).toEqual(['frueh', 'spaet']);
	});
});

describe('terminInstanzen (Wiederholung)', () => {
	const T = new Date(2026, 5, 1, 0, 0).getTime(); // Mo, 01.06.2026, 00:00

	it('einmalig: nur wenn im Bereich', () => {
		expect(terminInstanzen([mk('a', T + 9 * 3_600_000)], T, T + DAY)).toHaveLength(1);
		expect(terminInstanzen([mk('a', T - DAY)], T, T + DAY)).toHaveLength(0);
	});

	it('täglich: ein Vorkommen pro Tag im Bereich', () => {
		const inst = terminInstanzen([mk('d', T + 9 * 3_600_000, 'daily')], T, T + 6 * DAY + 23 * 3_600_000);
		expect(inst).toHaveLength(7);
		expect(new Set(inst.map((i) => tagKey(i.startAt))).size).toBe(7);
	});

	it('täglich startet vor dem Bereich → erstes Vorkommen >= von', () => {
		const inst = terminInstanzen([mk('d', T - 10 * DAY + 9 * 3_600_000, 'daily')], T, T + 2 * DAY + 12 * 3_600_000);
		expect(inst.length).toBeGreaterThan(0);
		expect(inst.every((i) => i.startAt >= T)).toBe(true);
	});

	it('wöchentlich: alle 7 Tage', () => {
		const inst = terminInstanzen([mk('w', T + 9 * 3_600_000, 'weekly')], T, T + 21 * DAY + 12 * 3_600_000);
		expect(inst).toHaveLength(4);
	});

	it('monatlich: gleicher Tag je Monat', () => {
		const start = new Date(2026, 0, 15, 9, 0).getTime();
		const inst = terminInstanzen(
			[mk('m', start, 'monthly')],
			new Date(2026, 0, 1).getTime(),
			new Date(2026, 2, 31).getTime()
		);
		expect(inst.map((i) => new Date(i.startAt).getMonth())).toEqual([0, 1, 2]); // Jan, Feb, Mär
	});

	it('überspringt ausgenommene Vorkommen (exDates)', () => {
		const t = { ...mk('d', T + 9 * 3_600_000, 'daily'), exDates: [new Date(2026, 5, 2).getTime()] };
		const inst = terminInstanzen([t], T, T + 6 * DAY + 23 * 3_600_000);
		expect(inst).toHaveLength(6); // 7 Tage minus der ausgenommene 02.06.
		expect(inst.some((i) => tagKey(i.startAt) === '2026-06-02')).toBe(false);
	});

	it('recurrenceUntil begrenzt die Serie', () => {
		const inst = terminInstanzen(
			[mk('d', T + 9 * 3_600_000, 'daily', T + 2 * DAY)],
			T,
			T + 10 * DAY
		);
		expect(inst.every((i) => i.startAt <= T + 2 * DAY)).toBe(true);
	});
});
