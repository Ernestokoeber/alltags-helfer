<script lang="ts">
	import { exportBackup, importBackup, type ImportResult } from '$lib/db/backup';
	import Icon from '$lib/components/Icon.svelte';

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
</script>

<section class="space-y-4">
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

	<div class="card p-4">
		<h3 class="text-sm font-medium text-zinc-300">Geräte-Sync</h3>
		<p class="mt-2 text-xs leading-relaxed text-zinc-500">
			Automatischer Abgleich zwischen Geräten kommt später über einen eigenen, self-hosted Server
			(Phase 6 der Roadmap). Bis dahin ist Export → Import der Weg, Daten mitzunehmen.
		</p>
	</div>
</section>
