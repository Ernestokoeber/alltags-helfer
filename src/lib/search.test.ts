import { describe, expect, it } from 'vitest';
import { sucheAlles, type SuchDaten } from './search';
import type { Note, Project, Appointment } from './db/types';

const META = { createdAt: 0, updatedAt: 0, deletedAt: null as number | null };

function note(id: string, content: string, tags: string[] = []): Note {
	return { ...META, id, content, type: 'text', category: 'offen', pinned: false, importance: 0, tags };
}
function projekt(id: string, name: string, description?: string): Project {
	return { ...META, id, name, description, category: 'geschaeftlich', archived: false };
}
function termin(id: string, title: string, location?: string): Appointment {
	return { ...META, id, title, startAt: 0, category: 'offen', location };
}
function daten(over: Partial<SuchDaten> = {}): SuchDaten {
	return { notizen: [], projekte: [], termine: [], ...over };
}

describe('sucheAlles', () => {
	it('leere Query liefert keine Treffer', () => {
		const r = sucheAlles('   ', daten({ notizen: [note('a', 'Hallo')] }));
		expect(r.anzahl).toBe(0);
	});

	it('findet über alle Typen, case-insensitive, inkl. Tags/Beschreibung/Ort', () => {
		const d = daten({
			notizen: [note('n1', 'Server PATCHEN'), note('n2', 'irrelevant', ['wichtig'])],
			projekte: [projekt('p1', 'ITM', 'Wichtige Sachen')],
			termine: [termin('t1', 'Meeting', 'Wichtig-Raum')]
		});
		const r = sucheAlles('wichtig', d);
		expect(r.notizen.map((n) => n.id)).toEqual(['n2']); // Tag-Treffer
		expect(r.projekte.map((p) => p.id)).toEqual(['p1']);
		expect(r.termine.map((t) => t.id)).toEqual(['t1']);
		expect(r.anzahl).toBe(3);

		expect(sucheAlles('patchen', d).notizen.map((n) => n.id)).toEqual(['n1']);
	});

	it('ignoriert gelöschte und begrenzt pro Gruppe', () => {
		const geloescht = { ...note('x', 'treffer'), deletedAt: 1 };
		const viele = Array.from({ length: 12 }, (_, i) => note(`n${i}`, `treffer ${i}`));
		const r = sucheAlles('treffer', daten({ notizen: [geloescht, ...viele] }), 8);
		expect(r.notizen).toHaveLength(8); // Limit
		expect(r.notizen.some((n) => n.id === 'x')).toBe(false); // gelöscht raus
	});
});
