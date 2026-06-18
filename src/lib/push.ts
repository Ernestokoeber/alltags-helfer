// Generische Push-Erinnerungen: Abo verwalten + Erinnerungs-ZEITEN (kein Inhalt!)
// zum Worker hochladen. Bei Fälligkeit schickt der Worker eine *generische* Push.
// E2EE bleibt gewahrt — der Server sieht nur Zeitpunkte, niemals Inhalte.
import { SYNC_URL, loadConfig } from './sync';
import { openTasks } from './db/notes';
import { allAppointments } from './db/appointments';
import { terminInstanzen } from './calendar';
import type { Note, Appointment } from './db/types';

// Öffentlicher VAPID-Key (passend zur Worker-Var VAPID_PUBLIC) — kein Geheimnis.
const VAPID_PUBLIC =
	'BH673Yw7zDJPL3_CRScYeFpkkAY2o5bpvUqiSx3Hj8AVjWRNs1yQMd1o4L1rJ18kpAWkW5xJnF4yWhQQ7PuEROg';

const HORIZONT = 90 * 86_400_000; // 90 Tage vorausschauen
const STANDARD_LEAD = 30; // Minuten Vorlauf vor Terminbeginn

export function pushUnterstuetzt(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		'serviceWorker' in navigator &&
		typeof window !== 'undefined' &&
		'PushManager' in window &&
		'Notification' in window
	);
}

export function pushErlaubnis(): NotificationPermission {
	return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

// base64url → Uint8Array (für applicationServerKey). Rückgabe explizit
// ArrayBuffer-gebunden, sonst akzeptiert BufferSource den Typ nicht.
function b64urlZuBytes(b64url: string): Uint8Array<ArrayBuffer> {
	const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
	const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(b64);
	const bytes = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
	return bytes;
}

async function postAnWorker(pfad: string, body: unknown): Promise<void> {
	const code = loadConfig().code;
	if (!code) throw new Error('Sync ist nicht eingerichtet (Sync-Code fehlt).');
	const res = await fetch(`${SYNC_URL}${pfad}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${code}` },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Worker-Fehler ${res.status}`);
}

// Ist auf diesem Gerät bereits ein Push-Abo aktiv?
export async function istAbonniert(): Promise<boolean> {
	if (!pushUnterstuetzt()) return false;
	const reg = await navigator.serviceWorker.ready;
	return (await reg.pushManager.getSubscription()) != null;
}

// Reine Berechnung der Erinnerungs-Zeitpunkte (gut testbar): offene Aufgaben-Fristen
// + Termine inkl. Wiederholungen im Horizont, jeweils mit Vorlauf. Nur Zeiten.
export function erinnerungsZeiten(tasks: Note[], termine: Appointment[], jetzt: number): number[] {
	const zeiten: number[] = [];
	for (const t of tasks) if (t.dueAt != null && t.dueAt > jetzt) zeiten.push(t.dueAt);
	for (const a of terminInstanzen(termine, jetzt, jetzt + HORIZONT)) {
		const lead = (a.reminderLead ?? STANDARD_LEAD) * 60_000;
		const at = a.startAt - lead;
		if (at > jetzt) zeiten.push(at);
	}
	return zeiten.sort((x, y) => x - y);
}

// Push aktivieren: Erlaubnis anfragen, abonnieren, Abo + Zeitplan hochladen.
// Gibt true zurück, wenn aktiv. Wirft mit Klartext-Fehler bei Problemen.
export async function aktivierePush(): Promise<boolean> {
	if (!pushUnterstuetzt()) throw new Error('Dieses Gerät unterstützt keine Web-Push.');
	if (!loadConfig().code) throw new Error('Bitte zuerst den Geräte-Sync einrichten (Sync-Code).');

	const erlaubnis = await Notification.requestPermission();
	if (erlaubnis !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');

	const reg = await navigator.serviceWorker.ready;
	let sub = await reg.pushManager.getSubscription();
	if (!sub) {
		sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: b64urlZuBytes(VAPID_PUBLIC)
		});
	}
	await postAnWorker('/push/subscribe', { endpoint: sub.endpoint });
	await aktualisiereErinnerungsplan();
	return true;
}

// Erinnerungs-Zeitplan neu berechnen und hochladen — nur, wenn dieses Gerät
// abonniert ist (sonst gibt es nichts zu benachrichtigen). Fehler werden
// geschluckt (Hintergrund-Aktualisierung soll den Sync nie blockieren).
export async function aktualisiereErinnerungsplan(): Promise<void> {
	try {
		if (!loadConfig().code || !(await istAbonniert())) return;
		const [tasks, termine] = await Promise.all([openTasks(), allAppointments()]);
		const zeiten = erinnerungsZeiten(tasks, termine, Date.now());
		await postAnWorker('/push/reminders', { times: zeiten });
	} catch {
		/* Hintergrund-Aktualisierung — Fehler nicht eskalieren */
	}
}
