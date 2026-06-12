import { describe, expect, it } from 'vitest';
import { filterBySphere, matchesSphere } from './sphere';

describe('matchesSphere', () => {
	it('zeigt in „Alles" jede Kategorie', () => {
		expect(matchesSphere('privat', 'alles')).toBe(true);
		expect(matchesSphere('geschaeftlich', 'alles')).toBe(true);
		expect(matchesSphere('offen', 'alles')).toBe(true);
	});

	it('zeigt in „Privat" nur Privates und Offenes', () => {
		expect(matchesSphere('privat', 'privat')).toBe(true);
		expect(matchesSphere('offen', 'privat')).toBe(true);
		expect(matchesSphere('geschaeftlich', 'privat')).toBe(false);
	});

	it('zeigt in „Arbeit" nur Geschäftliches und Offenes', () => {
		expect(matchesSphere('geschaeftlich', 'geschaeftlich')).toBe(true);
		expect(matchesSphere('offen', 'geschaeftlich')).toBe(true);
		expect(matchesSphere('privat', 'geschaeftlich')).toBe(false);
	});
});

describe('filterBySphere', () => {
	it('filtert eine Liste nach der aktiven Sphäre', () => {
		const items = [
			{ id: 1, category: 'privat' as const },
			{ id: 2, category: 'geschaeftlich' as const },
			{ id: 3, category: 'offen' as const }
		];
		expect(filterBySphere(items, 'privat').map((i) => i.id)).toEqual([1, 3]);
		expect(filterBySphere(items, 'geschaeftlich').map((i) => i.id)).toEqual([2, 3]);
		expect(filterBySphere(items, 'alles').map((i) => i.id)).toEqual([1, 2, 3]);
	});
});
