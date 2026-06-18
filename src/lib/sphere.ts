import type { Category } from './db/types';

// Die „Sphäre" ist der globale Blickwinkel der App: Privat, Arbeit oder Alles.
// Sie verknüpft beide Lebensbereiche in einer App — ein Umschalter im Header
// filtert sämtliche Inhalte (Notizen, Aufgaben, Termine).
export type Sphere = 'alles' | 'privat' | 'geschaeftlich';

// Gehört ein Eintrag mit dieser Kategorie in die aktive Sphäre?
// „Offene" (noch unsortierte) Einträge erscheinen bewusst in jeder Sphäre,
// damit nichts unsichtbar wird, nur weil es noch nicht einsortiert ist.
export function matchesSphere(category: Category, sphere: Sphere): boolean {
	return sphere === 'alles' || category === 'offen' || category === sphere;
}

export function filterBySphere<T extends { category: Category }>(
	items: T[],
	sphere: Sphere
): T[] {
	return items.filter((i) => matchesSphere(i.category, sphere));
}

// Einheitliche Beschriftung der Kategorien in der UI.
// Datenwert bleibt 'geschaeftlich' (sync-/DB-kompatibel), angezeigt wird „Arbeit".
export const categoryLabel: Record<Category, string> = {
	privat: 'Privat',
	geschaeftlich: 'Arbeit',
	offen: 'Offen'
};

// Farbwelt je Kategorie: Privat = Amber (warm), Arbeit = Himmelblau (kühl).
export const categoryBadge: Record<Category, string> = {
	privat: 'bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/25',
	geschaeftlich: 'bg-sky-400/15 text-sky-300 ring-1 ring-inset ring-sky-400/25',
	offen: 'bg-white/[0.06] text-zinc-400 ring-1 ring-inset ring-white/10'
};

// Aktiver Chip-Zustand je Kategorie (für Auswahl-Buttons).
export const categoryChipActive: Record<Category, string> = {
	privat: 'bg-amber-400/90 text-zinc-950',
	geschaeftlich: 'bg-sky-400/90 text-zinc-950',
	offen: 'bg-zinc-200 text-zinc-900'
};
