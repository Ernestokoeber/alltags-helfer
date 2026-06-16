import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addNote, softDeleteNote } from './notes';
import { addAppointment } from './appointments';
import {
	addProject,
	allProjects,
	setProjectArchived,
	deleteProject,
	notesForProject,
	noteCountByProject,
	childProjects,
	hasChildren,
	projectPath,
	canAddContent,
	canAddSubproject,
	childCountByProject,
	pickerProjects
} from './projects';

beforeEach(async () => {
	await db.projects.clear();
	await db.notes.clear();
	await db.appointments.clear();
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
		// Zeitstempel explizit zurücksetzen: zwei addNote() im selben Tick können
		// dieselbe Millisekunde bekommen — dann wäre die Sortierung nicht definiert.
		await db.notes.update(n1.id, { createdAt: n1.createdAt - 60_000 });
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

describe('Projekt-Hierarchie', () => {
	it('childProjects(null) liefert nur Wurzelprojekte, mit parentId nur direkte Kinder', async () => {
		const itm = await addProject({ name: 'ITM' });
		const privat = await addProject({ name: 'Privat' });
		const auslagern = await addProject({ name: 'Auslagern24.de', parentId: itm.id });
		await addProject({ name: 'Sub-Sub', parentId: auslagern.id });

		const wurzeln = await childProjects(null);
		expect(wurzeln.map((p) => p.name).sort()).toEqual(['ITM', 'Privat']);
		expect(wurzeln.find((p) => p.id === privat.id)).toBeDefined();

		const kinderVonItm = await childProjects(itm.id);
		expect(kinderVonItm.map((p) => p.name)).toEqual(['Auslagern24.de']);
	});

	it('hasChildren erkennt Ordner vs. Blatt', async () => {
		const itm = await addProject({ name: 'ITM' });
		const auslagern = await addProject({ name: 'Auslagern24.de', parentId: itm.id });
		expect(await hasChildren(itm.id)).toBe(true);
		expect(await hasChildren(auslagern.id)).toBe(false);
	});

	it('projectPath liefert den Pfad von der Wurzel bis zum Projekt', async () => {
		const itm = await addProject({ name: 'ITM' });
		const auslagern = await addProject({ name: 'Auslagern24.de', parentId: itm.id });
		const tief = await addProject({ name: 'Buchungsstrecke', parentId: auslagern.id });

		const pfad = await projectPath(tief.id);
		expect(pfad.map((p) => p.name)).toEqual(['ITM', 'Auslagern24.de', 'Buchungsstrecke']);
	});

	it('canAddContent nur in Blättern, canAddSubproject nur ohne eigene Inhalte', async () => {
		const itm = await addProject({ name: 'ITM' });
		const auslagern = await addProject({ name: 'Auslagern24.de', parentId: itm.id });

		// ITM ist Ordner → keine Inhalte; darf aber weitere Unterprojekte
		expect(await canAddContent(itm.id)).toBe(false);
		expect(await canAddSubproject(itm.id)).toBe(true);

		// Blatt ohne Inhalte → beides erlaubt
		expect(await canAddContent(auslagern.id)).toBe(true);
		expect(await canAddSubproject(auslagern.id)).toBe(true);

		// Sobald das Blatt eine Notiz hat, kein Unterprojekt mehr
		await addNote({ content: 'erste Aufgabe', projectId: auslagern.id });
		expect(await canAddSubproject(auslagern.id)).toBe(false);
		expect(await canAddContent(auslagern.id)).toBe(true);

		// Termin als Inhalt blockt ebenfalls Unterprojekte
		const leer = await addProject({ name: 'Leer' });
		await addAppointment({ title: 'Kickoff', startAt: Date.now() + 1000, projectId: leer.id });
		expect(await canAddSubproject(leer.id)).toBe(false);
	});

	it('deleteProject löscht den kompletten Teilbaum und löst Notizen/Termine', async () => {
		const itm = await addProject({ name: 'ITM' });
		const auslagern = await addProject({ name: 'Auslagern24.de', parentId: itm.id });
		const tief = await addProject({ name: 'Buchungsstrecke', parentId: auslagern.id });
		const n = await addNote({ content: 'bleibt erhalten', projectId: tief.id });
		const t = await addAppointment({
			title: 'Termin',
			startAt: Date.now() + 1000,
			projectId: tief.id
		});

		await deleteProject(itm.id);

		// gesamter Teilbaum als gelöscht markiert
		expect((await db.projects.get(itm.id))?.deletedAt).not.toBeNull();
		expect((await db.projects.get(auslagern.id))?.deletedAt).not.toBeNull();
		expect((await db.projects.get(tief.id))?.deletedAt).not.toBeNull();
		expect(await childProjects(null)).toHaveLength(0);

		// Inhalte bleiben erhalten, verlieren nur den Bezug
		const nd = await db.notes.get(n.id);
		expect(nd?.deletedAt).toBeNull();
		expect(nd?.projectId).toBeUndefined();
		const td = await db.appointments.get(t.id);
		expect(td?.deletedAt).toBeNull();
		expect(td?.projectId).toBeUndefined();
	});

	it('childCountByProject zählt aktive direkte Unterprojekte', async () => {
		const itm = await addProject({ name: 'ITM' });
		await addProject({ name: 'A', parentId: itm.id });
		const b = await addProject({ name: 'B', parentId: itm.id });
		await deleteProject(b.id);

		const counts = await childCountByProject();
		expect(counts.get(itm.id)).toBe(1);
	});

	it('pickerProjects: nur Blätter, mit vollem Pfad-Label', async () => {
		const itm = await addProject({ name: 'ITM' });
		const auslagern = await addProject({ name: 'Auslagern24.de', parentId: itm.id });
		await addProject({ name: 'Privat-Notizen' }); // eigenständiges Blatt

		const optionen = await pickerProjects();
		const labels = optionen.map((o) => o.label);
		// ITM ist Ordner → nicht enthalten; Blätter mit Pfad bzw. Name.
		expect(labels).toContain('ITM › Auslagern24.de');
		expect(labels).toContain('Privat-Notizen');
		expect(labels).not.toContain('ITM');
		expect(optionen.find((o) => o.id === auslagern.id)?.category).toBe('geschaeftlich');
	});
});
