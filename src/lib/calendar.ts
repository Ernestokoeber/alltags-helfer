// Reine Logik für die Monats-Kalenderansicht der Termine.
import type { Appointment } from './db/types';

// 42 Tage (6 Wochen) fürs Monatsraster, beginnend am Montag der ersten Woche.
// `monat` 0–11. Reine Funktion (nur Date-Konstruktion, kein Date.now).
export function monatsTage(jahr: number, monat: number): Date[] {
	const erster = new Date(jahr, monat, 1);
	const versatz = (erster.getDay() + 6) % 7; // Mo=0 … So=6
	const tage: Date[] = [];
	for (let i = 0; i < 42; i++) {
		tage.push(new Date(jahr, monat, 1 - versatz + i));
	}
	return tage;
}

// Lokaler Tagesschlüssel YYYY-MM-DD (zeitzonensicher über lokale Komponenten).
export function tagKey(d: Date | number): string {
	const x = typeof d === 'number' ? new Date(d) : d;
	const m = String(x.getMonth() + 1).padStart(2, '0');
	const t = String(x.getDate()).padStart(2, '0');
	return `${x.getFullYear()}-${m}-${t}`;
}

// Termine im Bereich [von, bis] als konkrete Instanzen — wiederkehrende Termine
// werden in einzelne Vorkommen (mit angepasstem startAt) aufgefächert. Einmalige
// Termine erscheinen nur, wenn sie im Bereich liegen. Eine Instanz behält die id
// des Serien-Termins (Löschen/Bearbeiten betrifft die ganze Serie).
export function terminInstanzen(termine: Appointment[], von: number, bis: number): Appointment[] {
	const out: Appointment[] = [];
	for (const t of termine) {
		if (t.deletedAt != null) continue;
		const r = t.recurrence;
		const ende = Math.min(bis, t.recurrenceUntil ?? bis);

		if (!r) {
			if (t.startAt >= von && t.startAt <= bis) out.push(t);
			continue;
		}

		if (r === 'daily' || r === 'weekly') {
			const schritt = (r === 'daily' ? 1 : 7) * 86_400_000;
			// Auf das erste Vorkommen >= von vorspulen (Datum bleibt korrekt; über
			// Sommer-/Winterzeit kann die Uhrzeit um 1 h driften — für die Anzeige ok).
			let ms = t.startAt;
			if (ms < von) ms += Math.ceil((von - ms) / schritt) * schritt;
			for (; ms <= ende; ms += schritt) {
				if (ms >= t.startAt) out.push({ ...t, startAt: ms });
			}
		} else {
			// monatlich: komponentenweise (gleicher Tag im Monat); wenige Iterationen.
			let occ = new Date(t.startAt);
			let guard = 0;
			while (occ.getTime() <= ende && guard < 600) {
				const ms = occ.getTime();
				if (ms >= von && ms >= t.startAt) out.push({ ...t, startAt: ms });
				occ = new Date(occ.getFullYear(), occ.getMonth() + 1, occ.getDate(), occ.getHours(), occ.getMinutes());
				guard++;
			}
		}
	}
	return out;
}

// Termine nach lokalem Tag gruppieren, je Tag aufsteigend nach Startzeit.
export function gruppiereNachTag(termine: Appointment[]): Map<string, Appointment[]> {
	const map = new Map<string, Appointment[]>();
	for (const t of termine) {
		if (t.deletedAt != null) continue;
		const k = tagKey(t.startAt);
		const arr = map.get(k);
		if (arr) arr.push(t);
		else map.set(k, [t]);
	}
	for (const arr of map.values()) arr.sort((a, b) => a.startAt - b.startAt);
	return map;
}
