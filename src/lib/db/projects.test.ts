import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addNote, softDeleteNote } from './notes';
import {
	addProject,
	allProjects,
	setProjectArchived,
	deleteProject,
	notesForProject,
	noteCountByProject
} from './projects';

beforeEach(async () => {
	await db.projects.clear();
	await db.notes.clear();
});

describe('Projekte', () => {
	it('addProject legt ein Projekt an (Standard-Kategorie: Arbeit)', async () => {
		const p = await addProject({ name: 'Projekt Atlas', description: 'Kundenportal' });
		expect(p.id).toBeTruthy();
		expect(p.category).toBe('geschaeftlich');
		expect(p.archived).toBe(false);
		expect(await db.projects.get(p.id)).toBeDefined();
	});

	it('allProjects: laufende vor archivierten, ohne gelöschte', async () => {
		const a = await addProject({ name: 'A' });
		const b = await addProject({ name: 'B' });
		const c = await addProject({ name: 'C' });
		await setProjectArchived(a.id, true);
		await deleteProject(c.id);

		const liste = await allProjects();
		expect(liste.map((p) => p.name)).toEqual(['B', 'A']);
		expect(liste[1].archived).toBe(true);
	});

	it('notesForProject: nur Notizen des Projekts, neueste zuerst, ohne gelöschte', async () => {
		const p = await addProject({ name: 'Atlas' });
		const n1 = await addNote({ content: 'Kickoff-Protokoll', projectId: p.id });
		await addNote({ content: 'API-Schlüssel anfragen', projectId: p.id });
		await addNote({ content: 'ohne Projekt' });
		const weg = await addNote({ content: 'gelöscht', projectId: p.id });
		await softDeleteNote(weg.id);

		const liste = await notesForProject(p.id);
		expect(liste.map((n) => n.content)).toEqual(['API-Schlüssel anfragen', 'Kickoff-Protokoll']);
		expect(liste.at(-1)?.id).toBe(n1.id);
	});

	it('deleteProject löst die Notiz-Zuordnung, löscht die Notizen aber nicht', async () => {
		const p = await addProject({ name: 'Atlas' });
		const n = await addNote({ content: 'bleibt erhalten', projectId: p.id });

		await deleteProject(p.id);

		const danach = await db.notes.get(n.id);
		expect(danach?.deletedAt).toBeNull();
		expect(danach?.projectId).toBeUndefined();
		expect(await notesForProject(p.id)).toHaveLength(0);
	});

	it('noteCountByProject zählt aktive Notizen je Projekt', async () => {
		const p1 = await addProject({ name: 'Eins' });
		const p2 = await addProject({ name: 'Zwei' });
		await addNote({ content: 'a', projectId: p1.id });
		await addNote({ content: 'b', projectId: p1.id });
		await addNote({ content: 'c', projectId: p2.id });
		const weg = await addNote({ content: 'd', projectId: p2.id });
		await softDeleteNote(weg.id);

		const counts = await noteCountByProject();
		expect(counts.get(p1.id)).toBe(2);
		expect(counts.get(p2.id)).toBe(1);
	});
});
