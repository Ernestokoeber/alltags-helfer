import { db, uuid } from './db';
import type { SleepEntry } from './types';

// Schlafdauer in Minuten; behandelt Zeiten über Mitternacht (z. B. 23:00 → 07:00).
export function sleepDuration(bedTime: string, wakeTime: string): number {
	const [bh, bm] = bedTime.split(':').map(Number);
	const [wh, wm] = wakeTime.split(':').map(Number);
	let mins = wh * 60 + wm - (bh * 60 + bm);
	if (mins <= 0) mins += 24 * 60;
	return mins;
}

// Ein Eintrag pro Datum (upsert): existiert schon einer, wird er aktualisiert.
export async function saveSleepEntry(input: {
	date: string;
	bedTime: string;
	wakeTime: string;
	quality: number;
	note?: string;
}): Promise<SleepEntry> {
	const now = Date.now();
	const existing = (await db.sleepEntries.where('date').equals(input.date).toArray()).find(
		(e) => e.deletedAt === null
	);
	if (existing) {
		const updated: SleepEntry = { ...existing, ...input, updatedAt: now };
		await db.sleepEntries.put(updated);
		return updated;
	}
	const entry: SleepEntry = {
		id: uuid(),
		date: input.date,
		bedTime: input.bedTime,
		wakeTime: input.wakeTime,
		quality: input.quality,
		note: input.note,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.sleepEntries.add(entry);
	return entry;
}

export async function sleepForDate(date: string): Promise<SleepEntry | undefined> {
	return (await db.sleepEntries.where('date').equals(date).toArray()).find(
		(e) => e.deletedAt === null
	);
}

// Durchschnittliche Schlafdauer (Minuten, gerundet) über die gegebenen Einträge.
// Leere Liste → null (kein Durchschnitt darstellbar).
export function averageSleepMinutes(entries: SleepEntry[]): number | null {
	if (entries.length === 0) return null;
	const sum = entries.reduce((acc, e) => acc + sleepDuration(e.bedTime, e.wakeTime), 0);
	return Math.round(sum / entries.length);
}

// Schlaf-Trend fürs Balkendiagramm: chronologisch (alt → neu), Dauer in Minuten.
// Reine Funktion über bereits geladene Einträge.
export function schlafTrend(entries: SleepEntry[]): { date: string; minutes: number }[] {
	return entries
		.filter((e) => e.deletedAt === null)
		.slice()
		.sort((a, b) => a.date.localeCompare(b.date))
		.map((e) => ({ date: e.date, minutes: sleepDuration(e.bedTime, e.wakeTime) }));
}

// Letzte N Einträge, nach Datum absteigend.
export async function recentSleep(limit = 7): Promise<SleepEntry[]> {
	const arr = await db.sleepEntries.toArray();
	return arr
		.filter((e) => e.deletedAt === null)
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, limit);
}

export async function deleteSleepEntry(id: string): Promise<void> {
	const now = Date.now();
	await db.sleepEntries.update(id, { deletedAt: now, updatedAt: now });
}
