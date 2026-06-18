import { db, uuid } from './db';
import type { SupportCase } from './types';

// Neuen Fall anlegen. Ohne Lösung = offen; mit Lösung direkt gelöst.
export async function addSupportCase(input: {
	customer: string;
	problem: string;
	solution?: string;
}): Promise<SupportCase | null> {
	const customer = input.customer.trim();
	const problem = input.problem.trim();
	if (!customer || !problem) return null;
	const now = Date.now();
	const solution = input.solution?.trim() || undefined;
	const fall: SupportCase = {
		id: uuid(),
		customer,
		problem,
		solution,
		status: solution ? 'geloest' : 'offen',
		resolvedAt: solution ? now : null,
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.supportCases.add(fall);
	return fall;
}

// Aktive Fälle: offene zuerst, sonst neueste zuerst.
export async function allSupportCases(): Promise<SupportCase[]> {
	const arr = await db.supportCases.toArray();
	return arr
		.filter((f) => f.deletedAt === null)
		.sort(
			(a, b) =>
				Number(a.status === 'geloest') - Number(b.status === 'geloest') || b.createdAt - a.createdAt
		);
}

// Fall bearbeiten (v. a. Lösung nachtragen). Gesetzte Lösung → gelöst + resolvedAt,
// leere Lösung → wieder offen.
export async function updateSupportCase(
	id: string,
	patch: { customer?: string; problem?: string; solution?: string | null }
): Promise<void> {
	const changes: Partial<SupportCase> = { updatedAt: Date.now() };
	if (patch.customer !== undefined) changes.customer = patch.customer.trim();
	if (patch.problem !== undefined) changes.problem = patch.problem.trim();
	if (patch.solution !== undefined) {
		const sol = patch.solution?.trim() || undefined;
		changes.solution = sol;
		changes.status = sol ? 'geloest' : 'offen';
		changes.resolvedAt = sol ? Date.now() : null;
	}
	await db.supportCases.update(id, changes);
}

export async function deleteSupportCase(id: string): Promise<void> {
	const now = Date.now();
	await db.supportCases.update(id, { deletedAt: now, updatedAt: now });
}
