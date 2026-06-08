import type { Category, Note } from './db/types';

// Kategorie-Filter der Notizenliste: 'alle' = keine Einschränkung.
export type CategoryFilter = Category | 'alle';

// Filtert Notizen clientseitig nach Suchbegriff (Inhalt + Tags) und Kategorie.
// Leerer Suchbegriff = kein Text-Filter, 'alle' = keine Kategorie-Einschränkung.
export function filterNotes(notes: Note[], query: string, category: CategoryFilter): Note[] {
	const q = query.trim().toLowerCase();
	return notes.filter((n) => {
		if (category !== 'alle' && n.category !== category) return false;
		if (!q) return true;
		return n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q));
	});
}
