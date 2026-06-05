import { describe, expect, it } from 'vitest';
import { suggestCategory } from './classify';

describe('suggestCategory (lokale Heuristik)', () => {
	it('erkennt eine geschäftliche Notiz', () => {
		expect(suggestCategory('Meeting mit dem Kunden vorbereiten')).toBe('geschaeftlich');
	});

	it('erkennt eine private Notiz', () => {
		expect(suggestCategory('Einkaufen: Milch und Brot, dann zum Arzt')).toBe('privat');
	});

	it('gibt null bei klar unklarer Notiz zurück', () => {
		expect(suggestCategory('Das war ein schöner Tag')).toBeNull();
	});

	it('gibt null bei Gleichstand zurück', () => {
		expect(suggestCategory('Meeting mit der Familie')).toBeNull();
	});

	it('ist gegenüber Groß-/Kleinschreibung unempfindlich', () => {
		expect(suggestCategory('RECHNUNG an Firma schicken')).toBe('geschaeftlich');
	});
});
