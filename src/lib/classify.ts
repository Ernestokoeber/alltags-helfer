// Lokale, regelbasierte Kategorie-Erkennung (kein Cloud, kein Netz).
// Deutsche Stichwort-Stämme, per Teilstring ausgewertet — bewusst einfach
// und transparent. Ergebnis ist ein Vorschlag, den der Nutzer bestätigt.

export type Suggestion = 'privat' | 'geschaeftlich' | null;

const GESCHAEFTLICH = [
	'meeting', 'kunde', 'rechnung', 'angebot', 'projekt', 'deadline', 'chef', 'kolleg',
	'büro', 'buero', 'firma', 'team', 'präsentation', 'praesentation', 'vertrag',
	'besprechung', 'konferenz', 'auftrag', 'client', 'server', 'deploy', 'release',
	'ticket', 'onboarding', 'bewerbung', 'gehalt', 'arbeit', 'office', 'geschäft',
	'geschaeft', 'lieferant', 'protokoll', 'quartal', 'umsatz', 'mandant'
];

const PRIVAT = [
	'einkauf', 'milch', 'brot', 'arzt', 'geburtstag', 'famili', 'freund', 'mama',
	'papa', 'eltern', 'kind', 'urlaub', 'sport', 'fitness', 'geschenk', 'hochzeit',
	'hobby', 'garten', 'haushalt', 'wäsche', 'waesche', 'kochen', 'rezept', 'friseur',
	'hund', 'katze', 'ferien', 'party'
];

function treffer(text: string, stems: string[]): number {
	return stems.reduce((n, s) => (text.includes(s) ? n + 1 : n), 0);
}

// Schlägt eine Kategorie für eine "offene" Notiz vor.
// null = unklar (0:0 oder Gleichstand) -> kein Vorschlag.
export function suggestCategory(text: string): Suggestion {
	const t = text.toLowerCase();
	const g = treffer(t, GESCHAEFTLICH);
	const p = treffer(t, PRIVAT);
	if (g === p) return null;
	return g > p ? 'geschaeftlich' : 'privat';
}
