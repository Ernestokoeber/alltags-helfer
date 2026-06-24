import { describe, expect, it } from 'vitest';
import type { Category, TimeEntry } from './db/types';
import {
	dauerMinuten,
	minutenHeute,
	minutenDieseWoche,
	proFach,
	letzteTage,
	streak
} from './tracking';

const NOW = new Date(2026, 5, 24, 12, 0, 0).getTime(); // Mi, 24.06.2026, 12:00

let c = 0;
function mk(start: Date, minuten: number, fach = 'AP1', cat: Category = 'privat'): TimeEntry {
	const s = start.getTime();
	return {
		id: `t${++c}`,
		sourceApp: 'manuell',
		activity: fach,
		category: cat,
		startedAt: s,
		endedAt: s + minuten * 60_000,
		metadata: undefined,
		createdAt: s,
		updatedAt: s,
		deletedAt: null
	};
}
const tag = (d: number, std = 9) => new Date(2026, 5, d, std);

describe('tracking-Aggregation', () => {
	it('dauerMinuten: Differenz in Minuten', () => {
		expect(dauerMinuten(mk(tag(24), 90))).toBe(90);
	});

	it('minutenHeute: nur der heutige Tag', () => {
		const e = [mk(tag(24), 60), mk(tag(23), 30)];
		expect(minutenHeute(e, NOW)).toBe(60);
	});

	it('minutenDieseWoche: Vorwoche zählt nicht', () => {
		const e = [mk(tag(24), 60), mk(tag(10), 30)]; // 10.06. = ≥ 14 Tage zurück
		expect(minutenDieseWoche(e, NOW)).toBe(60);
	});

	it('proFach: summiert je Fach, absteigend', () => {
		const e = [mk(tag(24), 60, 'AP1'), mk(tag(23), 30, 'AP1'), mk(tag(22), 45, 'Security+')];
		expect(proFach(e)).toEqual([
			{ fach: 'AP1', minuten: 90 },
			{ fach: 'Security+', minuten: 45 }
		]);
	});

	it('letzteTage: N Tage inkl. Lücken, älteste zuerst', () => {
		const e = [mk(tag(24), 60), mk(tag(22), 30)];
		const r = letzteTage(e, 3, NOW);
		expect(r.map((x) => x.minuten)).toEqual([30, 0, 60]); // 22., 23., 24.
	});

	it('streak: aufeinanderfolgende Tage', () => {
		const e = [mk(tag(24), 60), mk(tag(23), 30), mk(tag(22), 20)];
		expect(streak(e, NOW)).toBe(3);
	});

	it('streak: heute offen → zählt ab gestern (Kulanz)', () => {
		const e = [mk(tag(23), 30), mk(tag(22), 20)]; // heute (24.) nichts
		expect(streak(e, NOW)).toBe(2);
	});

	it('streak: nichts Aktuelles → 0', () => {
		const e = [mk(tag(19), 30)]; // vor 5 Tagen
		expect(streak(e, NOW)).toBe(0);
	});
});
