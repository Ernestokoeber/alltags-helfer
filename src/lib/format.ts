// Termin-Zeit relativ zum Tag beschriften: "Heute, 14:30" / "Morgen, 09:00"
// / "Mi., 10.06., 14:00". now ist injizierbar (für Tests).
export function relativeDayLabel(ms: number, now: number = Date.now()): string {
	const d = new Date(ms);
	const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

	const heuteMitternacht = new Date(now);
	heuteMitternacht.setHours(0, 0, 0, 0);
	const zielMitternacht = new Date(ms);
	zielMitternacht.setHours(0, 0, 0, 0);
	const tageDiff = Math.round(
		(zielMitternacht.getTime() - heuteMitternacht.getTime()) / 86_400_000
	);

	if (tageDiff === 0) return `Heute, ${zeit}`;
	if (tageDiff === 1) return `Morgen, ${zeit}`;
	const tag = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
	return `${tag}, ${zeit}`;
}

// Tagesabhängige Begrüßung fürs „Heute"-Kopffeld. Bänder nach Nutzervorgabe;
// Grenzen minutengenau (z. B. 09:00 zählt noch zum Morgen, 09:01 zur Arbeitszeit).
export function tagesgruss(d: Date = new Date()): string {
	const m = d.getHours() * 60 + d.getMinutes();
	if (m >= 360 && m <= 540) return 'Guten Morgen.'; // 06:00–09:00
	if (m >= 541 && m <= 720) return 'Es ist Arbeitszeit.'; // 09:01–12:00
	if (m >= 721 && m <= 840) return 'Mahlzeit!'; // 12:01–14:00
	if (m >= 841 && m <= 1080) return 'Noch lange nicht fertig.'; // 14:01–18:00
	if (m >= 1081 && m <= 1320) return 'Guten Abend.'; // 18:01–22:00
	if (m >= 1321) return 'Wie lange willst du machen?'; // 22:01–23:59
	return 'Zeit zu schlafen.'; // 00:00–05:59
}
