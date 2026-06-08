import { describe, expect, it } from 'vitest';
import { filterNotes } from './notes-filter';
import type { Note } from './db/types';

// Minimaler Note-Builder für die Tests.
function note(partial: Partial<Note> & Pick<Note, 'id' | 'content' | 'category'>): Note {
	return {
		type: 'text',
		pinned: false,
		importance: 0,
		tags: [],
		createdAt: 0,
		updatedAt: 0,
		deletedAt: null,
		...partial
	};
}

const beispiele: Note[] = [
	note({ id: '1', content: 'Rechnung an Kunde', category: 'geschaeftlich', tags: ['arbeit'] }),
	note({ id: '2', content: 'Geschenk für Mama', category: 'privat', tags: ['familie'] }),
	note({ id: '3', content: 'Noch unklar', category: 'offen' })
];

describe('filterNotes', () => {
	it('gibt bei Kategorie "alle" und leerer Suche alles zurück', () => {
		expect(filterNotes(beispiele, '', 'alle')).toHaveLength(3);
	});

	it('filtert auf eine Kategorie', () => {
		const res = filterNotes(beispiele, '', 'privat');
		expect(res).toHaveLength(1);
		expect(res[0].id).toBe('2');
	});

	it('kombiniert Kategorie und Suchbegriff', () => {
		expect(filterNotes(beispiele, 'rechnung', 'geschaeftlich')).toHaveLength(1);
		// Suchbegriff passt, aber Kategorie nicht → leer.
		expect(filterNotes(beispiele, 'rechnung', 'privat')).toHaveLength(0);
	});

	it('sucht case-insensitive in Inhalt und Tags', () => {
		expect(filterNotes(beispiele, 'KUNDE', 'alle')).toHaveLength(1);
		expect(filterNotes(beispiele, 'familie', 'alle')[0].id).toBe('2');
	});

	it('liefert leeres Array, wenn nichts passt', () => {
		expect(filterNotes(beispiele, 'xyz', 'alle')).toHaveLength(0);
	});
});
