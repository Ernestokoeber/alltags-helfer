import { db, uuid } from './db';
import type { Category, Note, Project } from './types';

// Projekte bündeln Notizen zu einem laufenden Vorhaben (v. a. Arbeit,
// aber auch privat). Archivieren statt löschen, damit die Historie bleibt.

export async function addProject(input: {
	name: string;
	description?: string;
	category?: Category;
	parentId?: string;
}): Promise<Project> {
	const now = Date.now();
	const projekt: Project = {
		id: uuid(),
		name: input.name.trim(),
		description: input.description?.trim() || undefined,
		category: input.category ?? 'geschaeftlich',
		archived: false,
		parentId: input.parentId,
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

// Direkte Unterprojekte einer Ebene: parentId === gegebenem Wert. Mit null
// liefert es die Wurzelprojekte (ohne parentId). Sortierung wie allProjects.
export async function childProjects(parentId: string | null): Promise<Project[]> {
	const arr = await db.projects.toArray();
	return arr
		.filter((p) => p.deletedAt === null && (p.parentId ?? null) === parentId)
		.sort((a, b) => Number(a.archived) - Number(b.archived) || b.updatedAt - a.updatedAt);
}

// Hat das Projekt aktive Unterprojekte? Entscheidet Ordner vs. Arbeitsbereich.
export async function hasChildren(projectId: string): Promise<boolean> {
	const arr = await db.projects.toArray();
	return arr.some((p) => p.deletedAt === null && p.parentId === projectId);
}

// Pfad von der Wurzel bis zum Projekt (inklusive) — für die Breadcrumb.
// Zyklus-Schutz über ein Set, falls parentId je inkonsistent würde.
export async function projectPath(projectId: string): Promise<Project[]> {
	const all = await db.projects.toArray();
	const byId = new Map(all.map((p) => [p.id, p]));
	const path: Project[] = [];
	const seen = new Set<string>();
	let cur = byId.get(projectId);
	while (cur && !seen.has(cur.id)) {
		seen.add(cur.id);
		path.unshift(cur);
		cur = cur.parentId ? byId.get(cur.parentId) : undefined;
	}
	return path;
}

// Inhalte (Notizen/Termine) nur in Blättern: erlaubt, solange keine
// Unterprojekte existieren.
export async function canAddContent(projectId: string): Promise<boolean> {
	return !(await hasChildren(projectId));
}

// Unterprojekt nur erlaubt, solange das Projekt selbst noch keine Inhalte
// (Notizen oder Termine) hat — sonst bräche „Inhalte nur im Blatt".
export async function canAddSubproject(projectId: string): Promise<boolean> {
	const notes = await db.notes.where('projectId').equals(projectId).toArray();
	if (notes.some((n) => n.deletedAt === null)) return false;
	const apps = await db.appointments.where('projectId').equals(projectId).toArray();
	if (apps.some((a) => a.deletedAt === null)) return false;
	return true;
}

// Auswahloption für Projekt-Dropdowns (Notizen-/Termine-Tab): Inhalte sind nur
// in Blättern erlaubt, daher nur Projekte ohne Unterprojekte — beschriftet mit
// dem vollen Pfad (ITM › Auslagern24.de) zur eindeutigen Zuordnung.
export interface ProjectOption {
	id: string;
	label: string;
	category: Category;
}

export async function pickerProjects(): Promise<ProjectOption[]> {
	const all = (await db.projects.toArray()).filter((p) => p.deletedAt === null);
	const byId = new Map(all.map((p) => [p.id, p]));
	const istElternteil = new Set(all.filter((p) => p.parentId).map((p) => p.parentId as string));
	const pfadLabel = (p: Project): string => {
		const teile: string[] = [];
		const seen = new Set<string>();
		let cur: Project | undefined = p;
		while (cur && !seen.has(cur.id)) {
			seen.add(cur.id);
			teile.unshift(cur.name);
			cur = cur.parentId ? byId.get(cur.parentId) : undefined;
		}
		return teile.join(' › ');
	};
	return all
		.filter((p) => !istElternteil.has(p.id)) // nur Blätter
		.map((p) => ({ id: p.id, label: pfadLabel(p), category: p.category }))
		.sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

// Anzahl aktiver direkter Unterprojekte je Projekt (für die Ordner-Anzeige).
export async function childCountByProject(): Promise<Map<string, number>> {
	const arr = await db.projects.toArray();
	const map = new Map<string, number>();
	for (const p of arr) {
		if (p.deletedAt === null && p.parentId) {
			map.set(p.parentId, (map.get(p.parentId) ?? 0) + 1);
		}
	}
	return map;
}

// Soft-Delete eines Projekts samt komplettem Teilbaum (alle Nachfahren).
// Zugeordnete Notizen und Termine bleiben bestehen und verlieren nur den Bezug.
export async function deleteProject(id: string): Promise<void> {
	const now = Date.now();
	const all = await db.projects.toArray();

	// Teilbaum sammeln: Start-Projekt + alle (transitiven) Nachfahren.
	const ids = new Set<string>([id]);
	let added = true;
	while (added) {
		added = false;
		for (const p of all) {
			if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) {
				ids.add(p.id);
				added = true;
			}
		}
	}

	for (const pid of ids) {
		await db.projects.update(pid, { deletedAt: now, updatedAt: now });
		await db.notes
			.where('projectId')
			.equals(pid)
			.modify((n) => {
				delete n.projectId;
				n.updatedAt = now;
			});
		await db.appointments
			.where('projectId')
			.equals(pid)
			.modify((a) => {
				delete a.projectId;
				a.updatedAt = now;
			});
	}
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
