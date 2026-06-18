import { db, uuid } from './db';
import type { Colleague, ColleagueNote } from './types';

// Feste IDs fürs Seeding → über Geräte hinweg dedupliziert (Last-Write-Wins beim
// Sync), und ein gelöschter Seed bleibt gelöscht (wir legen nur an, was es noch
// nie gab — auch keinen Tombstone überschreiben).
const SEEDS: { id: string; name: string }[] = [
	{ id: 'seed-tim', name: 'Tim' },
	{ id: 'seed-patrice', name: 'Patrice' },
	{ id: 'seed-nepomuk', name: 'Nepomuk' }
];

export async function seedColleaguesIfNew(): Promise<void> {
	const now = Date.now();
	for (const s of SEEDS) {
		if (!(await db.colleagues.get(s.id))) {
			await db.colleagues.add({
				id: s.id,
				name: s.name,
				createdAt: now,
				updatedAt: now,
				deletedAt: null
			});
		}
	}
}

export async function addColleague(name: string): Promise<Colleague | null> {
	const n = name.trim();
	if (!n) return null;
	const now = Date.now();
	const c: Colleague = { id: uuid(), name: n, createdAt: now, updatedAt: now, deletedAt: null };
	await db.colleagues.add(c);
	return c;
}

// Aktive Kollegen, alphabetisch.
export async function allColleagues(): Promise<Colleague[]> {
	const arr = await db.colleagues.toArray();
	return arr.filter((c) => c.deletedAt === null).sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteColleague(id: string): Promise<void> {
	const now = Date.now();
	await db.colleagues.update(id, { deletedAt: now, updatedAt: now });
}

// --- Notizen für Kollegen ---
export async function addColleagueNote(input: {
	colleagueId: string;
	content: string;
}): Promise<ColleagueNote | null> {
	const content = input.content.trim();
	if (!content || !input.colleagueId) return null;
	const now = Date.now();
	const note: ColleagueNote = {
		id: uuid(),
		colleagueId: input.colleagueId,
		content,
		done: false,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.colleagueNotes.add(note);
	return note;
}

// Aktive Kollegen-Notizen: offene zuerst, sonst neueste zuerst.
export async function allColleagueNotes(): Promise<ColleagueNote[]> {
	const arr = await db.colleagueNotes.toArray();
	return arr
		.filter((n) => n.deletedAt === null)
		.sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
}

export async function setColleagueNoteDone(id: string, done: boolean): Promise<void> {
	await db.colleagueNotes.update(id, { done, updatedAt: Date.now() });
}

export async function deleteColleagueNote(id: string): Promise<void> {
	const now = Date.now();
	await db.colleagueNotes.update(id, { deletedAt: now, updatedAt: now });
}
