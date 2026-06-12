import { db, uuid } from './db';
import type { Appointment, Category } from './types';

export async function addAppointment(input: {
	title: string;
	startAt: number;
	category?: Category;
	location?: string;
	description?: string;
	reminderLead?: number;
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

export async function deleteAppointment(id: string): Promise<void> {
	const now = Date.now();
	await db.appointments.update(id, { deletedAt: now, updatedAt: now });
}
