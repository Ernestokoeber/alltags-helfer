import { describe, expect, it } from 'vitest';
import { relativeDayLabel, tagesgruss } from './format';

describe('relativeDayLabel', () => {
	const now = new Date('2026-06-05T10:00:00').getTime();

	it('zeigt "Heute, HH:MM" für denselben Tag', () => {
		const t = new Date('2026-06-05T14:30:00').getTime();
		expect(relativeDayLabel(t, now)).toBe('Heute, 14:30');
	});

	it('zeigt "Morgen, HH:MM" für den Folgetag', () => {
		const t = new Date('2026-06-06T09:00:00').getTime();
		expect(relativeDayLabel(t, now)).toBe('Morgen, 09:00');
	});

	it('zeigt das Datum für spätere Tage', () => {
		const t = new Date('2026-06-10T14:00:00').getTime();
		expect(relativeDayLabel(t, now)).toMatch(/10\.06/);
	});
});

describe('tagesgruss', () => {
	const um = (h: number, min: number) => tagesgruss(new Date(2026, 0, 1, h, min));

	it('trifft die Bänder inkl. minutengenauer Grenzen', () => {
		expect(um(6, 0)).toBe('Guten Morgen.');
		expect(um(8, 59)).toBe('Guten Morgen.');
		expect(um(9, 0)).toBe('Guten Morgen.'); // 09:00 noch Morgen
		expect(um(9, 1)).toBe('Es ist Arbeitszeit.'); // 09:01 Arbeitszeit
		expect(um(12, 0)).toBe('Es ist Arbeitszeit.');
		expect(um(12, 1)).toBe('Mahlzeit!');
		expect(um(14, 0)).toBe('Mahlzeit!');
		expect(um(14, 1)).toBe('Noch lange nicht fertig.');
		expect(um(18, 0)).toBe('Noch lange nicht fertig.');
		expect(um(18, 1)).toBe('Guten Abend.');
		expect(um(22, 0)).toBe('Guten Abend.');
		expect(um(22, 1)).toBe('Wie lange willst du machen?');
		expect(um(23, 59)).toBe('Wie lange willst du machen?');
	});

	it('zeigt nachts (00:00–06:00) „Zeit zu schlafen."', () => {
		expect(um(0, 0)).toBe('Zeit zu schlafen.');
		expect(um(3, 30)).toBe('Zeit zu schlafen.');
		expect(um(5, 59)).toBe('Zeit zu schlafen.');
	});
});
