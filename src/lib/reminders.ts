// In-App-Erinnerungen: was braucht jetzt Aufmerksamkeit? Reine Funktion über den
// bereits vorhandenen Daten (offene Aufgaben mit Frist + anstehende Termine).
// Keine eigene Persistenz, keine System-Benachrichtigungen.
import type { Note, Appointment } from './db/types';

const TAG_MS = 86_400_000; // Horizont „demnächst" = nächste 24 h

export type Erinnerung =
	| { art: 'aufgabe'; note: Note; zeit: number; ueberfaellig: boolean }
	| { art: 'termin'; appointment: Appointment; zeit: number; ueberfaellig: false };

export interface Erinnerungen {
	items: Erinnerung[];
	anzahl: number;
}

// `notes`/`appointments` werden bereits (z. B. nach Sphäre) gefiltert übergeben.
export function faelligeErinnerungen(
	notes: Note[],
	appointments: Appointment[],
	now: number = Date.now()
): Erinnerungen {
	const horizont = now + TAG_MS;
	const items: Erinnerung[] = [];

	for (const n of notes) {
		// Nur offene Aufgaben mit Frist; überfällige (egal wie alt) und bald fällige.
		if (n.deletedAt != null || n.completedAt != null || n.dueAt == null) continue;
		if (n.dueAt <= horizont) {
			items.push({ art: 'aufgabe', note: n, zeit: n.dueAt, ueberfaellig: n.dueAt < now });
		}
	}

	for (const a of appointments) {
		if (a.deletedAt != null) continue;
		if (a.startAt >= now && a.startAt <= horizont) {
			items.push({ art: 'termin', appointment: a, zeit: a.startAt, ueberfaellig: false });
		}
	}

	items.sort((x, y) => x.zeit - y.zeit); // dringendstes (frühestes) zuerst
	return { items, anzahl: items.length };
}
