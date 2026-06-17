// Globale Suche über alle Nutzdaten. Reine Funktion über bereits geladene Listen;
// case-insensitive, pro Gruppe begrenzt. Leere Query → keine Treffer.
import type { Note, Project, Appointment, BucketItem } from './db/types';

export interface SuchDaten {
	notizen: Note[];
	projekte: Project[];
	termine: Appointment[];
	bucket: BucketItem[];
}

export interface SuchTreffer {
	notizen: Note[];
	projekte: Project[];
	termine: Appointment[];
	bucket: BucketItem[];
	anzahl: number;
}

function passt(felder: (string | undefined)[], q: string): boolean {
	return felder.some((f) => f != null && f.toLowerCase().includes(q));
}

function aktiv<T extends { deletedAt: number | null }>(x: T): boolean {
	return x.deletedAt === null;
}

export function sucheAlles(query: string, daten: SuchDaten, limit = 8): SuchTreffer {
	const q = query.trim().toLowerCase();
	if (!q) return { notizen: [], projekte: [], termine: [], bucket: [], anzahl: 0 };

	const notizen = daten.notizen
		.filter(aktiv)
		.filter((n) => passt([n.content, ...n.tags], q))
		.slice(0, limit);
	const projekte = daten.projekte
		.filter(aktiv)
		.filter((p) => passt([p.name, p.description], q))
		.slice(0, limit);
	const termine = daten.termine
		.filter(aktiv)
		.filter((t) => passt([t.title, t.location], q))
		.slice(0, limit);
	const bucket = daten.bucket
		.filter(aktiv)
		.filter((b) => passt([b.title, b.description], q))
		.slice(0, limit);

	return {
		notizen,
		projekte,
		termine,
		bucket,
		anzahl: notizen.length + projekte.length + termine.length + bucket.length
	};
}
