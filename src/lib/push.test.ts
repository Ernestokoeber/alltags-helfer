import { describe, expect, it } from 'vitest';
import { erinnerungsZeiten } from './push';
import type { Note, Appointment } from './db/types';

function task(dueAt: number | null): Note {
	return {
		id: 'n',
		content: 'x',
		type: 'text',
		category: 'offen',
		pinned: false,
		importance: 0,
		tags: [],
		dueAt,
		completedAt: null,
		createdAt: 0,
		updatedAt: 0,
		deletedAt: null
	};
}

function termin(startAt: number, extra: Partial<Appointment> = {}): Appointment {
	return {
		id: 'a',
		title: 't',
		startAt,
		category: 'offen',
		createdAt: 0,
		updatedAt: 0,
		deletedAt: null,
		...extra
	};
}

const MIN = 60_000;

describe('Push-Erinnerungszeiten', () => {
	it('sammelt nur zukünftige Aufgaben-Fristen', () => {
		const z = erinnerungsZeiten([task(2000), task(500), task(null)], [], 1000);
		expect(z).toEqual([2000]);
	});

	it('Termine mit Standard-Vorlauf (30 min), sortiert', () => {
		const start = 60 * MIN; // in 1 h
		expect(erinnerungsZeiten([], [termin(start)], 0)).toEqual([start - 30 * MIN]);
	});

	it('eigener reminderLead überschreibt den Standard', () => {
		const start = 120 * MIN;
		expect(erinnerungsZeiten([], [termin(start, { reminderLead: 10 })], 0)).toEqual([
			start - 10 * MIN
		]);
	});

	it('mischt Aufgaben + Termine und sortiert aufsteigend', () => {
		const z = erinnerungsZeiten([task(100 * MIN)], [termin(60 * MIN)], 0);
		expect(z).toEqual([60 * MIN - 30 * MIN, 100 * MIN]);
	});
});
