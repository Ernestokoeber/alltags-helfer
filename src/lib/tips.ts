// Sanfter „Heute"-Tipp (Entschleunigung). Rein lokal, regelbasiert — kein Cloud,
// nicht bevormundend: erst situative Kontextregeln, sonst ein kuratierter Spruch,
// der pro Tag deterministisch rotiert (kein Math.random → stabil + testbar).

export interface TippKontext {
	now: Date;
	offeneAufgaben: number;
	anstehendeTermine: number;
}

// Kuratierte Achtsamkeits-/Entschleunigungs-Sprüche (ruhig, nicht aufdringlich).
export const TIPP_SPRUECHE = [
	'Atme einmal tief durch, bevor du weitermachst.',
	'Eine Sache nach der anderen.',
	'Pausen sind kein Zeitverlust.',
	'Du musst heute nicht alles schaffen.',
	'Kleine Schritte zählen auch.',
	'Mach für einen Moment den Kopf frei.',
	'Gut ist gut genug.'
] as const;

// Tag des Jahres (1-basiert, lokale Zeit) — Grundlage der täglichen Rotation.
function tagDesJahres(d: Date): number {
	const start = new Date(d.getFullYear(), 0, 0);
	const diff = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime();
	return Math.floor(diff / 86_400_000);
}

// Liefert den Tipp für „heute". Kontextregeln haben Vorrang (in dieser Reihenfolge),
// sonst ein rotierender Spruch.
export function tagestipp(ctx: TippKontext): string {
	const h = ctx.now.getHours();

	// 1. Späte Nacht: Ruhe geht allem voraus.
	if (h >= 22 || h < 5) return 'Der Tag ist getan. Ruh dich aus.';
	// 2. Früher Morgen: sanft starten.
	if (h < 8) return 'Lass den Tag langsam beginnen.';
	// 3. Viel auf der Liste: Fokus statt Überforderung.
	if (ctx.offeneAufgaben >= 5) return 'Viel auf der Liste — nimm dir eins nach dem anderen vor.';
	// 4. Nichts drängt: die Ruhe genießen.
	if (ctx.offeneAufgaben === 0 && ctx.anstehendeTermine === 0)
		return 'Nichts drängt gerade. Genieß die Ruhe.';

	// 5. Standard: kuratierter Spruch, täglich rotierend.
	return TIPP_SPRUECHE[tagDesJahres(ctx.now) % TIPP_SPRUECHE.length];
}
