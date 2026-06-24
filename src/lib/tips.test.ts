import { describe, expect, it } from 'vitest';
import { tagestipp, TIPP_SPRUECHE } from './tips';

// Hilfsdatum: bestimmter Tag + Uhrzeit (lokale Zeit).
function am(jahr: number, monat: number, tag: number, stunde: number): Date {
	return new Date(jahr, monat - 1, tag, stunde, 0, 0);
}

describe('tagestipp', () => {
	it('späte Nacht hat Vorrang vor allem (auch bei vielen Aufgaben)', () => {
		expect(tagestipp({ now: am(2026, 6, 24, 23), offeneAufgaben: 9, anstehendeTermine: 3 })).toBe(
			'Der Tag ist getan. Ruh dich aus.'
		);
		expect(tagestipp({ now: am(2026, 6, 24, 3), offeneAufgaben: 0, anstehendeTermine: 0 })).toBe(
			'Der Tag ist getan. Ruh dich aus.'
		);
	});

	it('früher Morgen: sanfter Start', () => {
		expect(tagestipp({ now: am(2026, 6, 24, 6), offeneAufgaben: 9, anstehendeTermine: 0 })).toBe(
			'Lass den Tag langsam beginnen.'
		);
	});

	it('viele offene Aufgaben → Fokus-Hinweis', () => {
		expect(tagestipp({ now: am(2026, 6, 24, 10), offeneAufgaben: 5, anstehendeTermine: 0 })).toBe(
			'Viel auf der Liste — nimm dir eins nach dem anderen vor.'
		);
	});

	it('nichts offen und keine Termine → Ruhe genießen', () => {
		expect(tagestipp({ now: am(2026, 6, 24, 14), offeneAufgaben: 0, anstehendeTermine: 0 })).toBe(
			'Nichts drängt gerade. Genieß die Ruhe.'
		);
	});

	it('Standardfall: kuratierter Spruch, pro Tag deterministisch', () => {
		const ctx = { offeneAufgaben: 2, anstehendeTermine: 1 };
		const tipp1 = tagestipp({ now: am(2026, 6, 24, 15), ...ctx });
		const tipp2 = tagestipp({ now: am(2026, 6, 24, 11), ...ctx }); // selber Tag, andere Stunde
		expect(tipp1).toBe(tipp2); // gleicher Tag → gleicher Spruch
		expect(TIPP_SPRUECHE).toContain(tipp1);

		// Anderer Tag → kann ein anderer Spruch sein (zumindest gültig + rotiert).
		const morgen = tagestipp({ now: am(2026, 6, 25, 15), ...ctx });
		expect(TIPP_SPRUECHE).toContain(morgen);
	});
});
