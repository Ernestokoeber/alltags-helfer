<script lang="ts">
	import { exportBackup, importBackup, type ImportResult } from '$lib/db/backup';
	import Icon from '$lib/components/Icon.svelte';
	import { syncState } from '$lib/sync-state.svelte';
	import { loadConfig, saveConfig, isConfigured } from '$lib/sync';

	// Export: Sicherung als JSON-Datei herunterladen.
	async function exportieren() {
		const backup = await exportBackup();
		const datum = new Date().toISOString().slice(0, 10);
		const blob = new Blob([JSON.stringify(backup, null, '\t')], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `alltags-helfer-backup-${datum}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Import: JSON-Datei wählen, einlesen, mergen (Last-Write-Wins).
	let dateiInput = $state<HTMLInputElement | null>(null);
	let ergebnis = $state<ImportResult | null>(null);
	let fehler = $state('');

	async function importieren(e: Event) {
		ergebnis = null;
		fehler = '';
		const datei = (e.target as HTMLInputElement).files?.[0];
		if (!datei) return;
		try {
			ergebnis = await importBackup(JSON.parse(await datei.text()));
		} catch (err) {
			fehler =
				err instanceof SyntaxError
					? 'Die Datei ist kein gültiges JSON.'
					: err instanceof Error
						? err.message
						: 'Import fehlgeschlagen.';
		}
		if (dateiInput) dateiInput.value = ''; // gleiche Datei erneut wählbar
	}

	// --- Geräte-Sync ---
	const cfg = loadConfig();
	let syncCode = $state(cfg.code);
	let e2eePass = $state(cfg.passphrase);
	let eingerichtet = $state(isConfigured());
	let zeigePass = $state(false);

	async function syncEinrichten() {
		saveConfig({ code: syncCode, passphrase: e2eePass });
		eingerichtet = isConfigured();
		await syncState.trigger();
	}

	function syncZeit(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<section class="space-y-4 lg:mx-auto lg:max-w-3xl">
	<h2 class="text-2xl font-bold tracking-tight">Einstellungen</h2>

	<div class="card space-y-3 p-4">
		<h3 class="text-sm font-medium text-zinc-300">Datensicherung</h3>
		<p class="text-xs leading-relaxed text-zinc-500">
			Deine Daten liegen nur auf diesem Gerät (local-first). Mit dem Export sicherst du alles als
			JSON-Datei — als Backup oder zum Umzug auf ein anderes Gerät. Beim Import gewinnt je Eintrag
			der neuere Stand; vorhandene Daten gehen nicht verloren.
		</p>
		<div class="flex flex-wrap gap-2">
			<button type="button" onclick={exportieren} class="btn-primary flex items-center gap-2">
				<Icon name="download" class="h-4 w-4" /> Daten exportieren
			</button>
			<button
				type="button"
				onclick={() => dateiInput?.click()}
				class="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 active:scale-95"
			>
				<Icon name="upload" class="h-4 w-4" /> Sicherung importieren
			</button>
			<input
				bind:this={dateiInput}
				type="file"
				accept="application/json,.json"
				onchange={importieren}
				aria-label="Sicherungsdatei wählen"
				class="hidden"
			/>
		</div>

		{#if ergebnis}
			<p
				role="status"
				class="rounded-xl border border-teal-400/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-200"
			>
				Import fertig: {ergebnis.added} neu, {ergebnis.updated} aktualisiert, {ergebnis.skipped}
				übersprungen (lokal aktueller oder unverändert).
			</p>
		{/if}
		{#if fehler}
			<p
				role="alert"
				class="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
			>
				{fehler}
			</p>
		{/if}
	</div>

	<div class="card space-y-3 p-4">
		<h3 class="text-sm font-medium text-zinc-300">Geräte-Sync</h3>
		<p class="text-xs leading-relaxed text-zinc-500">
			Gleicht deine Daten <strong class="text-zinc-300">Ende-zu-Ende-verschlüsselt</strong> mit deinen
			anderen Geräten ab (über deinen eigenen Cloudflare-Worker). Gib <strong class="text-zinc-300"
				>Sync-Code</strong
			>
			und <strong class="text-zinc-300">E2EE-Passwort</strong> auf jedem Gerät identisch ein — das
			Passwort verlässt dein Gerät nie und liegt auch nicht auf dem Server.
		</p>

		<label class="flex flex-col gap-1 text-xs text-zinc-400">
			Sync-Code
			<input
				bind:value={syncCode}
				type="password"
				autocomplete="off"
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
				placeholder="Sync-Code"
				class="field"
			/>
		</label>
		<div class="flex flex-col gap-1 text-xs text-zinc-400">
			<div class="flex items-center justify-between">
				<span>E2EE-Passwort (auf allen Geräten gleich)</span>
				<button
					type="button"
					onclick={() => (zeigePass = !zeigePass)}
					class="text-zinc-500 transition-colors hover:text-zinc-300"
				>
					{zeigePass ? 'verbergen' : 'anzeigen'}
				</button>
			</div>
			<input
				bind:value={e2eePass}
				type={zeigePass ? 'text' : 'password'}
				autocomplete="off"
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
				placeholder="E2EE-Passwort"
				class="field"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={syncEinrichten}
				disabled={!syncCode.trim() || !e2eePass || syncState.status === 'running'}
				class="btn-primary">Speichern &amp; synchronisieren</button
			>
			<button
				type="button"
				onclick={() => syncState.trigger()}
				disabled={!eingerichtet || syncState.status === 'running'}
				class="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
			>
				<Icon name="layers" class="h-4 w-4" /> Jetzt synchronisieren
			</button>
		</div>

		{#if syncState.status === 'running'}
			<p class="text-xs text-zinc-400">Synchronisiere …</p>
		{:else if syncState.status === 'ok'}
			<p
				role="status"
				class="rounded-xl border border-teal-400/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-200"
			>
				Sync erfolgreich: {syncState.message}{#if syncState.lastAt}
					· {syncZeit(syncState.lastAt)}{/if}
			</p>
		{:else if syncState.status === 'error'}
			<p
				role="alert"
				class="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
			>
				{syncState.message}
			</p>
		{:else if syncState.lastAt}
			<p class="text-xs text-zinc-500">Zuletzt synchronisiert: {syncZeit(syncState.lastAt)}</p>
		{/if}
	</div>
</section>
