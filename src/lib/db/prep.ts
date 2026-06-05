import { db, uuid } from './db';
import type { PrepTask } from './types';

// Vorbereitungs-Aufgabe zu einem Termin anlegen.
export async function addPrepTask(appointmentId: string, title: string): Promise<PrepTask> {
	const now = Date.now();
	const task: PrepTask = {
		id: uuid(),
		appointmentId,
		title: title.trim(),
		done: false,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.prepTasks.add(task);
	return task;
}

// Aufgaben eines Termins, älteste zuerst, ohne gelöschte.
export async function prepTasksFor(appointmentId: string): Promise<PrepTask[]> {
	const arr = await db.prepTasks.where('appointmentId').equals(appointmentId).toArray();
	return arr.filter((t) => t.deletedAt === null).sort((a, b) => a.createdAt - b.createdAt);
}

export async function togglePrepDone(id: string, done: boolean): Promise<void> {
	await db.prepTasks.update(id, { done, updatedAt: Date.now() });
}

export async function deletePrepTask(id: string): Promise<void> {
	const now = Date.now();
	await db.prepTasks.update(id, { deletedAt: now, updatedAt: now });
}
