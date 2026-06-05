import { describe, expect, it } from 'vitest';
import { relativeDayLabel } from './format';

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
