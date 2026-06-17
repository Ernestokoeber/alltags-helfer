// Geteilter Sync-Status (Svelte-5-Rune) für Auto-Sync (Layout) und den manuellen
// Button (Einstellungen). Entkoppelt Auslöser von der Anzeige; ein laufender Sync
// wird nicht doppelt gestartet.
import { runSync, isConfigured, lastSyncAt } from './sync';

let running = false;

class SyncState {
	status = $state<'idle' | 'running' | 'ok' | 'error'>('idle');
	message = $state('');
	lastAt = $state<number | null>(null);

	constructor() {
		try {
			this.lastAt = lastSyncAt();
		} catch {
			// localStorage evtl. blockiert → kein letzter Stand.
		}
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
		} catch (e) {
			this.status = 'error';
			this.message = e instanceof Error ? e.message : 'Sync fehlgeschlagen.';
		} finally {
			running = false;
		}
	}
}

export const syncState = new SyncState();
