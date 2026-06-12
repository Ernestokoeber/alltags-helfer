import Dexie, { type Table } from 'dexie';
import type {
	Note,
	Tag,
	Appointment,
	PrepTask,
	Reminder,
	BucketItem,
	SleepEntry,
	TimeEntry
} from './types';

// Local-first Datenbank (IndexedDB via Dexie). Das Schema ist sync-fähig:
// '&id' = eigener UUID-Primärschlüssel (kein auto-increment), zusätzliche
// Indizes auf den Feldern, nach denen wir filtern/sortieren.
export class AppDB extends Dexie {
	notes!: Table<Note, string>;
	tags!: Table<Tag, string>;
	appointments!: Table<Appointment, string>;
	prepTasks!: Table<PrepTask, string>;
	reminders!: Table<Reminder, string>;
	bucketItems!: Table<BucketItem, string>;
	sleepEntries!: Table<SleepEntry, string>;
	timeEntries!: Table<TimeEntry, string>;

	constructor() {
		super('alltags-helfer');
		this.version(1).stores({
			notes: '&id, category, pinned, createdAt, updatedAt, deletedAt, *tags',
			tags: '&id, &name, updatedAt, deletedAt',
			appointments: '&id, startAt, updatedAt, deletedAt',
			prepTasks: '&id, appointmentId, done, remindAt, updatedAt, deletedAt',
			reminders: '&id, refType, refId, triggerAt, status, updatedAt, deletedAt',
			bucketItems: '&id, done, category, targetDate, updatedAt, deletedAt',
			sleepEntries: '&id, date, updatedAt, deletedAt',
			timeEntries: '&id, sourceApp, startedAt, updatedAt, deletedAt'
		});
		// v2: Termine bekommen eine Kategorie (Privat/Arbeit/Offen), damit die
		// Sphären-Sicht auch Termine filtern kann. Bestand wird auf 'offen' gesetzt.
		this.version(2)
			.stores({
				appointments: '&id, startAt, category, updatedAt, deletedAt'
			})
			.upgrade((tx) =>
				tx
					.table('appointments')
					.toCollection()
					.modify((a) => {
						a.category ??= 'offen';
					})
			);
	}
}

export const db = new AppDB();

// UUID-Erzeugung. crypto.randomUUID gibt es nur im "secure context"
// (HTTPS oder localhost). Beim Test über die LAN-IP der VM (http) fehlt das,
// daher ein Fallback, damit nichts abstürzt.
export function uuid(): string {
	if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
		return globalThis.crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
