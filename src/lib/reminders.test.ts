import { describe, expect, it } from 'vitest';
import { faelligeErinnerungen } from './reminders';
import type { Note, Appointment } from './db/types';

const BASE = 1_700_000_000_000;
const STD = 3_600_000;

function mkNote(over: Partial<Note> & { id: string }): Note {
	return {
		id: over.id,
		content: over.content ?? '',
		type: 'text',
		category: 'offen',
		pinned: false,
		importance: 0,
		tags: [],
		createdAt: BASE,
		updatedAt: BASE,
		deletedAt: over.deletedAt ?? null,
		dueAt: over.dueAt ?? null,
		completedAt: over.completedAt ?? null
	};
}

function mkTermin(over: Partial<Appointment> & { id: string }): Appointment {
	return {
		id: over.id,
		title: over.title ?? '',
		startAt: over.startAt ?? BASE,
		category: 'offen',
		createdAt: BASE,
		updatedAt: BASE,
		deletedAt: over.deletedAt ?? null
	};
}

describe('faelligeErinnerungen', () => {
	it('nimmt überfällige und bald fällige Aufgaben, ignoriert erledigte/fristlose/ferne', () => {
		const notes: Note[] = [
			mkNote({ id: 'ueberfaellig', dueAt: BASE - 2 * STD }),
			mkNote({ id: 'bald', dueAt: BASE + 12 * STD }),
			mkNote({ id: 'fern', dueAt: BASE + 48 * STD }), // > 24 h → raus
			mkNote({ id: 'erledigt', dueAt: BASE - STD, completedAt: BASE }), // raus
			mkNote({ id: 'ohne-frist' }), // raus
			mkNote({ id: 'geloescht', dueAt: BASE - STD, deletedAt: BASE }) // raus
		];

		const { items, anzahl } = faelligeErinnerungen(notes, [], BASE);
		expect(items.map((i) => (i.art === 'aufgabe' ? i.note.id : ''))).toEqual([
			'ueberfaellig',
			'bald'
		]);
		expect(anzahl).toBe(2);
		expect(items[0]).toMatchObject({ ueberfaellig: true });
		expect(items[1]).toMatchObject({ ueberfaellig: false });
	});

	it('nimmt anstehende Termine in 24 h, ignoriert vergangene/ferne', () => {
		const appts: Appointment[] = [
			mkTermin({ id: 'gleich', startAt: BASE + STD }),
			mkTermin({ id: 'vergangen', startAt: BASE - STD }), // raus
			mkTermin({ id: 'fern', startAt: BASE + 48 * STD }) // raus
		];
		const { items } = faelligeErinnerungen([], appts, BASE);
		expect(items.map((i) => (i.art === 'termin' ? i.appointment.id : ''))).toEqual(['gleich']);
	});

	it('mischt Aufgaben und Termine und sortiert nach Zeitpunkt', () => {
		const notes = [mkNote({ id: 'a', dueAt: BASE + 5 * STD })];
		const appts = [mkTermin({ id: 't', startAt: BASE + 2 * STD })];
		const { items } = faelligeErinnerungen(notes, appts, BASE);
		expect(items.map((i) => i.zeit)).toEqual([BASE + 2 * STD, BASE + 5 * STD]);
	});
});
