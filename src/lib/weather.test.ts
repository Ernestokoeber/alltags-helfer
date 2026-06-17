import { describe, expect, it } from 'vitest';
import { wmoToWetter } from './weather';

describe('wmoToWetter', () => {
	it('mappt WMO-Codes auf Icon + deutschen Kurztext', () => {
		expect(wmoToWetter(0)).toEqual({ icon: 'sun', text: 'Klar' });
		expect(wmoToWetter(3).text).toBe('Bedeckt');
		expect(wmoToWetter(45).icon).toBe('fog');
		expect(wmoToWetter(55).icon).toBe('rain');
		expect(wmoToWetter(63)).toEqual({ icon: 'rain', text: 'Regen' });
		expect(wmoToWetter(75).icon).toBe('snow');
		expect(wmoToWetter(82).icon).toBe('rain');
		expect(wmoToWetter(86).icon).toBe('snow');
		expect(wmoToWetter(95).icon).toBe('storm');
	});
});
