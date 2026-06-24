// Datenmodell des Alltags-Helfers.
// Alle Entitäten sind sync-fähig ausgelegt: eigener UUID-Schlüssel, Zeitstempel
// und ein deletedAt-Tombstone für Soft-Delete + späteren Geräte-Sync (P6).

export interface SyncMeta {
	id: string; // UUID
	createdAt: number; // Unix-ms
	updatedAt: number; // Unix-ms
	deletedAt: number | null; // null = aktiv; Zahl = gelöscht (Tombstone)
}

export type Category = 'privat' | 'geschaeftlich' | 'offen';

// Wiederholungsrhythmus für Termine; fehlt = einmalig.
export type Recurrence = 'daily' | 'weekly' | 'monthly';

export interface Note extends SyncMeta {
	content: string;
	type: 'text' | 'voice';
	category: Category;
	pinned: boolean;
	importance: number; // 0 = normal, höher = wichtiger
	tags: string[]; // Tag-Namen (in P0 bewusst einfach inline gehalten)
	projectId?: string; // optional einem Projekt zugeordnet (seit v3)
	dueAt?: number | null; // Aufgaben-Frist „bis wann erledigt"; null/fehlt = keine Frist (seit v4)
	completedAt?: number | null; // wann als erledigt markiert; null/fehlt = offen (seit v4)
	recurrence?: Recurrence; // wiederkehrende Aufgabe; beim Erledigen entsteht die nächste Instanz
	recurrenceUntil?: number | null; // optionales Ende der Wiederholung
	isTask?: boolean; // explizit als Aufgabe angelegt (Aufgaben-Tab); sonst gilt Frist/Projekt
	audioPath?: string;
	transcript?: string;
}

// Laufendes Projekt (v. a. Arbeit, aber auch privat möglich) — bündelt Notizen.
// Verschachtelbar über parentId: ITM → Auslagern24.de → … (Baumstruktur, seit v4).
export interface Project extends SyncMeta {
	name: string;
	description?: string;
	category: Category;
	archived: boolean; // abgeschlossen/pausiert, bleibt mit Notizen erhalten
	parentId?: string; // übergeordnetes Projekt; fehlt = Wurzel (seit v4)
}

export interface Tag extends SyncMeta {
	name: string;
}

export interface Appointment extends SyncMeta {
	title: string;
	startAt: number;
	category: Category; // Privat/Arbeit/Offen — seit v2, Bestand wird auf 'offen' migriert
	location?: string;
	description?: string;
	reminderLead?: number; // Minuten vor startAt
	projectId?: string; // optional einem Projekt zugeordnet (seit v4)
	recurrence?: Recurrence; // Wiederholung; fehlt = einmalig (seit 2026-06-18)
	recurrenceUntil?: number | null; // optionales Ende der Wiederholung (null/fehlt = unbegrenzt)
	exDates?: number[]; // ausgenommene Vorkommen einer Serie (Tagesbeginn in Unix-ms)
}

export interface PrepTask extends SyncMeta {
	appointmentId: string;
	title: string;
	done: boolean;
	remindAt?: number;
}

export type ReminderRef = 'note' | 'appointment' | 'preptask';

export interface Reminder extends SyncMeta {
	refType: ReminderRef;
	refId: string;
	triggerAt: number;
	status: 'pending' | 'done' | 'dismissed';
}

// --- Arbeitsbereich: Kollegen-Notizen + Kundensupport (standalone, nur Arbeit) ---

// Kollege = Empfänger einer Notiz. Editierbare Liste, vorbefüllt mit dem Team.
export interface Colleague extends SyncMeta {
	name: string;
}

// Notiz für einen Kollegen (Notepad bei Anrufen/Support).
export interface ColleagueNote extends SyncMeta {
	colleagueId: string;
	content: string;
	done: boolean; // weitergegeben/erledigt
}

// Kundensupport-Fall: Problem zuerst erfassen, Lösung wird nachgetragen.
export interface SupportCase extends SyncMeta {
	customer: string;
	problem: string;
	solution?: string;
	status: 'offen' | 'geloest';
	resolvedAt?: number | null;
}

// Angeheftete Notiz/Workflow, der dauerhaft oben unter der Überschrift eines Tabs
// bleibt. `scope` bestimmt den Tab (vorerst nur 'arbeit', bewusst erweiterbar).
export interface Pin extends SyncMeta {
	scope: string;
	content: string;
}

export interface TimeEntry extends SyncMeta {
	sourceApp: string;
	activity: string;
	category: Category;
	startedAt: number;
	endedAt: number;
	metadata?: Record<string, unknown>;
}
