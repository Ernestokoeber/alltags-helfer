// Reine Aggregations-Logik fürs Tracking-Dashboard (gut testbar, `now` injizierbar).
// Arbeitet auf bereits gefilterten (aktiven) TimeEntry-Listen.

import type { TimeEntry } from './db/types';

// Dauer eines Eintrags in Minuten (gerundet).
export function dauerMinuten(e: TimeEntry): number {
	return Math.round((e.endedAt - e.startedAt) / 60_000);
}

// Lokaler Tagesschlüssel 'YYYY-MM-DD' (für Tages-Gruppierung).
export function tagKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lokaler Tagesbeginn (00:00) als Unix-ms.
function tagesbeginn(ms: number): number {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

export function gesamtMinuten(entries: TimeEntry[]): number {
	return entries.reduce((s, e) => s + dauerMinuten(e), 0);
}

// Minuten am heutigen Tag.
export function minutenHeute(entries: TimeEntry[], now: number = Date.now()): number {
	const heute = tagKey(now);
	return gesamtMinuten(entries.filter((e) => tagKey(e.startedAt) === heute));
}

// Minuten der laufenden Woche (ab Montag 00:00, lokale Zeit).
export function minutenDieseWoche(entries: TimeEntry[], now: number = Date.now()): number {
	const d = new Date(tagesbeginn(now));
	const wochentag = (d.getDay() + 6) % 7; // Mo=0 … So=6
	d.setDate(d.getDate() - wochentag);
	const montag = d.getTime();
	return gesamtMinuten(entries.filter((e) => e.startedAt >= montag));
}

// Minuten pro Fach (activity), absteigend nach Dauer.
export function proFach(entries: TimeEntry[]): { fach: string; minuten: number }[] {
	const map = new Map<string, number>();
	for (const e of entries) map.set(e.activity, (map.get(e.activity) ?? 0) + dauerMinuten(e));
	return [...map.entries()]
		.map(([fach, minuten]) => ({ fach, minuten }))
		.sort((a, b) => b.minuten - a.minuten);
}

// Die letzten `anzahl` Tage (inkl. heute), älteste zuerst — auch Tage mit 0 Minuten,
// als Datenbasis für ein Balkendiagramm. `ms` = Tagesbeginn.
export function letzteTage(
	entries: TimeEntry[],
	anzahl: number,
	now: number = Date.now()
): { tag: string; ms: number; minuten: number }[] {
	const proTag = new Map<string, number>();
	for (const e of entries)
		proTag.set(tagKey(e.startedAt), (proTag.get(tagKey(e.startedAt)) ?? 0) + dauerMinuten(e));

	const out: { tag: string; ms: number; minuten: number }[] = [];
	const start = new Date(tagesbeginn(now));
	for (let i = anzahl - 1; i >= 0; i--) {
		const d = new Date(start);
		d.setDate(d.getDate() - i);
		const key = tagKey(d.getTime());
		out.push({ tag: key, ms: d.getTime(), minuten: proTag.get(key) ?? 0 });
	}
	return out;
}

// Lern-Streak: aufeinanderfolgende Tage mit mindestens einem Eintrag, endend heute.
// Kulanz: ist heute noch nichts erfasst, zählt die Serie ab gestern (Tag noch offen).
export function streak(entries: TimeEntry[], now: number = Date.now()): number {
	const tage = new Set(entries.map((e) => tagKey(e.startedAt)));
	const d = new Date(tagesbeginn(now));
	if (!tage.has(tagKey(d.getTime()))) {
		d.setDate(d.getDate() - 1);
		if (!tage.has(tagKey(d.getTime()))) return 0;
	}
	let n = 0;
	while (tage.has(tagKey(d.getTime()))) {
		n++;
		d.setDate(d.getDate() - 1);
	}
	return n;
}
