<script lang="ts">
	import { liveQuery } from 'dexie';
	import {
		saveSleepEntry,
		recentSleep,
		sleepDuration,
		deleteSleepEntry,
		averageSleepMinutes
	} from '$lib/db/sleep';
	import type { SleepEntry } from '$lib/db/types';

	function heuteISO(): string {
		const d = new Date();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${m}-${day}`;
	}

	let liste = $state<SleepEntry[]>([]);
	$effect(() => {
		const sub = liveQuery(() => recentSleep()).subscribe((v) => (liste = v));
		return () => sub.unsubscribe();
	});

	// Wochenschnitt = Ø Schlafdauer über die geladenen (letzten 7) Nächte.
	const schnitt = $derived(averageSleepMinutes(liste));

	let datum = $state(heuteISO());
	let bett = $state('23:00');
	let auf = $state('07:00');
	let qual = $state(4);
	let notiz = $state('');

	async function speichern() {
		await saveSleepEntry({
			date: datum,
			bedTime: bett,
			wakeTime: auf,
			quality: qual,
			note: notiz.trim() || undefined
		});
		notiz = '';
	}

	// Eintrag ins Formular laden; erneutes Speichern ersetzt ihn (Upsert pro Datum).
	function bearbeiten(e: SleepEntry) {
		datum = e.date;
		bett = e.bedTime;
		auf = e.wakeTime;
		qual = e.quality;
		notiz = e.note ?? '';
	}

	function minutesText(m: number): string {
		return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
	}

	function dauerText(bedTime: string, wakeTime: string): string {
		return minutesText(sleepDuration(bedTime, wakeTime));
	}

	function datumText(iso: string): string {
		return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit'
		});
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-semibold">Schlaf</h2>

	<div class="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<label class="block text-xs text-stone-500">
			Datum
			<input
				bind:value={datum}
				type="date"
				class="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm outline-none focus:border-teal-400"
			/>
		</label>
		<div class="flex gap-2">
			<label class="flex-1 text-xs text-stone-500">
				Zu Bett
				<input
					bind:value={bett}
					type="time"
					class="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm outline-none focus:border-teal-400"
				/>
			</label>
			<label class="flex-1 text-xs text-stone-500">
				Aufgewacht
				<input
					bind:value={auf}
					type="time"
					class="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm outline-none focus:border-teal-400"
				/>
			</label>
		</div>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-1">
				<span class="text-xs text-stone-500">Qualität</span>
				{#each [1, 2, 3, 4, 5] as q}
					<button
						type="button"
						onclick={() => (qual = q)}
						aria-label={`${q} Sterne`}
						class="text-lg {qual >= q ? 'text-amber-400' : 'text-stone-300'}">★</button
					>
				{/each}
			</div>
			<span class="text-xs text-stone-400">{dauerText(bett, auf)}</span>
		</div>
		<input
			bind:value={notiz}
			placeholder="Notiz (optional)"
			class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400"
		/>
		<div class="flex justify-end">
			<button
				type="button"
				onclick={speichern}
				class="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white"
			>
				Speichern
			</button>
		</div>
	</div>

	{#if schnitt !== null}
		<div
			class="flex items-center justify-between rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-100"
		>
			<span class="text-sm font-medium text-teal-800">Wochenschnitt</span>
			<span class="text-sm font-semibold text-teal-900">Ø {minutesText(schnitt)}</span>
		</div>
	{/if}

	<div class="space-y-2">
		<h3 class="px-1 text-sm font-medium text-stone-700">Letzte Nächte</h3>
		{#if liste.length === 0}
			<p class="px-1 text-sm text-stone-400">Noch keine Einträge.</p>
		{/if}
		{#each liste as e (e.id)}
			<div
				class="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100"
			>
				<div>
					<p class="text-sm font-medium text-stone-800">
						{datumText(e.date)} · {dauerText(e.bedTime, e.wakeTime)}
					</p>
					<p class="mt-0.5 text-xs text-stone-400">
						{e.bedTime}–{e.wakeTime} · {'★'.repeat(e.quality)}{e.note ? ` · ${e.note}` : ''}
					</p>
				</div>
				<div class="flex shrink-0 gap-1.5 text-stone-300">
					<button
						type="button"
						onclick={() => bearbeiten(e)}
						aria-label="Bearbeiten"
						class="hover:text-stone-600">✎</button
					>
					<button
						type="button"
						onclick={() => deleteSleepEntry(e.id)}
						aria-label="Löschen"
						class="hover:text-rose-500">✕</button
					>
				</div>
			</div>
		{/each}
	</div>
</section>
