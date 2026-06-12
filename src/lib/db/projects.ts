import { db, uuid } from './db';
import type { Category, Note, Project } from './types';

// Projekte bündeln Notizen zu einem laufenden Vorhaben (v. a. Arbeit,
// aber auch privat). Archivieren statt löschen, damit die Historie bleibt.

export async function addProject(input: {
	name: string;
	description?: string;
	category?: Category;
}): Promise<Project> {
	const now = Date.now();
	const projekt: Project = {
		id: uuid(),
		name: input.name.trim(),
		description: input.description?.trim() || undefined,
		category: input.category ?? 'geschaeftlich',
		archived: false,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.projects.add(projekt);
	return projekt;
}

// Alle aktiven (nicht gelöschten) Projekte: laufende zuerst, dann archivierte;
// innerhalb zuletzt geänderte zuerst.
export async function allProjects(): Promise<Project[]> {
	const arr = await db.projects.toArray();
	return arr
		.filter((p) => p.deletedAt === null)
		.sort((a, b) => Number(a.archived) - Number(b.archived) || b.updatedAt - a.updatedAt);
}

export async function setProjectArchived(id: string, archived: boolean): Promise<void> {
	await db.projects.update(id, { archived, updatedAt: Date.now() });
}

// Soft-Delete; zugeordnete Notizen bleiben bestehen und verlieren nur den Bezug.
export async function deleteProject(id: string): Promise<void> {
	const now = Date.now();
	await db.projects.update(id, { deletedAt: now, updatedAt: now });
	await db.notes
		.where('projectId')
		.equals(id)
		.modify((n) => {
			delete n.projectId;
			n.updatedAt = now;
		});
}

// Notizen eines Projekts, neueste zuerst, ohne gelöschte.
export async function notesForProject(projectId: string): Promise<Note[]> {
	const arr = await db.notes.where('projectId').equals(projectId).toArray();
	return arr.filter((n) => n.deletedAt === null).sort((a, b) => b.createdAt - a.createdAt);
}

// Anzahl aktiver Notizen je Projekt (für die Projektliste).
export async function noteCountByProject(): Promise<Map<string, number>> {
	const arr = await db.notes.toArray();
	const map = new Map<string, number>();
	for (const n of arr) {
		if (n.deletedAt === null && n.projectId) {
			map.set(n.projectId, (map.get(n.projectId) ?? 0) + 1);
		}
	}
	return map;
}
