import { db, uuid } from './db';
import type { Appointment, Category, Recurrence } from './types';

export async function addAppointment(input: {
	title: string;
	startAt: number;
	category?: Category;
	location?: string;
	description?: string;
	reminderLead?: number;
	projectId?: string;
	recurrence?: Recurrence;
	recurrenceUntil?: number | null;
}): Promise<Appointment> {
	const now = Date.now();
	const termin: Appointment = {
		id: uuid(),
		title: input.title.trim(),
		startAt: input.startAt,
		category: input.category ?? 'offen',
		location: input.location?.trim() || undefined,
		description: input.description?.trim() || undefined,
		reminderLead: input.reminderLead,
		projectId: input.projectId,
		recurrence: input.recurrence,
		recurrenceUntil: input.recurrenceUntil ?? null,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.appointments.add(termin);
	return termin;
}

// Zukünftige Termine (startAt >= from), aufsteigend, ohne gelöschte.
export async function upcomingAppointments(from: number = Date.now()): Promise<Appointment[]> {
	const arr = await db.appointments.where('startAt').aboveOrEqual(from).toArray();
	return arr.filter((t) => t.deletedAt === null).sort((a, b) => a.startAt - b.startAt);
}

// Alle aktiven Termine (auch vergangene), neueste zuerst — für die globale Suche.
export async function allAppointments(): Promise<Appointment[]> {
	const arr = await db.appointments.toArray();
	return arr.filter((t) => t.deletedAt === null).sort((a, b) => b.startAt - a.startAt);
}

export async function deleteAppointment(id: string): Promise<void> {
	const now = Date.now();
	await db.appointments.update(id, { deletedAt: now, updatedAt: now });
}

// Termin-Felder aktualisieren (Bearbeiten). updatedAt wird mitgesetzt.
export async function updateAppointment(
	id: string,
	patch: Partial<
		Pick<Appointment, 'title' | 'startAt' | 'location' | 'category' | 'recurrence' | 'recurrenceUntil'>
	>
): Promise<void> {
	await db.appointments.update(id, { ...patch, updatedAt: Date.now() });
}

// Ein einzelnes Vorkommen einer Serie ausnehmen (Tagesbeginn in ms).
export async function addExDate(id: string, tagBeginnMs: number): Promise<void> {
	const t = await db.appointments.get(id);
	if (!t) return;
	const ex = t.exDates ?? [];
	if (ex.includes(tagBeginnMs)) return;
	await db.appointments.update(id, { exDates: [...ex, tagBeginnMs], updatedAt: Date.now() });
}

// Termine eines Projekts, aufsteigend nach Startzeit, ohne gelöschte.
export async function appointmentsForProject(projectId: string): Promise<Appointment[]> {
	const arr = await db.appointments.where('projectId').equals(projectId).toArray();
	return arr.filter((a) => a.deletedAt === null).sort((a, b) => a.startAt - b.startAt);
}

// Anzahl aktiver Termine je Projekt (für die Projekt-Anzeige).
export async function appointmentCountByProject(): Promise<Map<string, number>> {
	const arr = await db.appointments.toArray();
	const map = new Map<string, number>();
	for (const a of arr) {
		if (a.deletedAt === null && a.projectId) {
			map.set(a.projectId, (map.get(a.projectId) ?? 0) + 1);
		}
	}
	return map;
}
