// Geteilter Sync-Status (Svelte-5-Rune) für Auto-Sync (Layout) und den manuellen
// Button (Einstellungen). Entkoppelt Auslöser von der Anzeige; ein laufender Sync
// wird nicht doppelt gestartet.
import { runSync, isConfigured, lastSyncAt } from './sync';
import { aktualisiereErinnerungsplan } from './push';

let running = false;

class SyncState {
	status = $state<'idle' | 'running' | 'ok' | 'error'>('idle');
	message = $state('');
	lastAt = $state<number | null>(null);
	#debounceId: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		try {
			this.lastAt = lastSyncAt();
		} catch {
			// localStorage evtl. blockiert → kein letzter Stand.
		}
	}

	// Entprellter Auslöser für lokale Änderungen: bündelt eine Schreibserie und
	// synchronisiert ~2 s nach der letzten Änderung. Läuft gerade ein Sync, wird
	// NICHT neu geplant — so lösen die lokalen Schreibvorgänge des Remote-Apply
	// (Sync schreibt empfangene Daten in die DB) keinen weiteren Sync aus.
	triggerDebounced(): void {
		if (running) return;
		clearTimeout(this.#debounceId);
		this.#debounceId = setTimeout(() => void this.trigger(), 2000);
	}

	// Einmaliger Sync-Durchlauf. No-op, wenn nicht eingerichtet oder schon laufend.
	async trigger(): Promise<void> {
		if (running || !isConfigured()) return;
		running = true;
		this.status = 'running';
		this.message = '';
		try {
			const r = await runSync();
			this.status = 'ok';
			this.lastAt = lastSyncAt();
			this.message = `${r.gepusht} gesendet · ${r.angewendet} empfangen`;
			// Push-Erinnerungszeiten im Hintergrund auffrischen (nur falls abonniert).
			void aktualisiereErinnerungsplan();
		} catch (e) {
			this.status = 'error';
			this.message = e instanceof Error ? e.message : 'Sync fehlgeschlagen.';
		} finally {
			running = false;
		}
	}
}

export const syncState = new SyncState();
