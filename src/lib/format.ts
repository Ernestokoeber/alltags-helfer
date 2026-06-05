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
