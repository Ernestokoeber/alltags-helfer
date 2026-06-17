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
	import Icon from '$lib/components/Icon.svelte';

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
	<h2 class="text-2xl font-bold tracking-tight">Schlaf</h2>

	<div class="card space-y-3 p-4 lg:max-w-2xl">
		<label class="block text-xs text-zinc-400">
			Datum
			<input bind:value={datum} type="date" class="field mt-1" />
		</label>
		<div class="flex gap-2">
			<label class="min-w-0 flex-1 text-xs text-zinc-400">
				Zu Bett
				<input bind:value={bett} type="time" class="field mt-1" />
			</label>
			<label class="min-w-0 flex-1 text-xs text-zinc-400">
				Aufgewacht
				<input bind:value={auf} type="time" class="field mt-1" />
			</label>
		</div>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-1.5">
				<span class="text-xs text-zinc-400">Qualität</span>
				{#each [1, 2, 3, 4, 5] as q (q)}
					<button
						type="button"
						onclick={() => (qual = q)}
						aria-label={`${q} Sterne`}
						class="transition-colors {qual >= q ? 'text-amber-300' : 'text-zinc-700 hover:text-zinc-500'}"
					>
						<Icon name="star" class="h-5 w-5" filled={qual >= q} />
					</button>
				{/each}
			</div>
			<span class="text-xs text-zinc-500">{dauerText(bett, auf)}</span>
		</div>
		<input bind:value={notiz} placeholder="Notiz (optional)" class="field" />
		<div class="flex justify-end">
			<button type="button" onclick={speichern} class="btn-primary">Speichern</button>
		</div>
	</div>

	{#if schnitt !== null}
		<div
			class="card flex items-center justify-between border-indigo-400/20 bg-indigo-400/[0.07] p-4 lg:max-w-2xl"
		>
			<span class="flex items-center gap-2 text-sm font-medium text-indigo-200">
				<Icon name="moon" class="h-4 w-4" /> Wochenschnitt
			</span>
			<span class="text-sm font-semibold text-indigo-100">Ø {minutesText(schnitt)}</span>
		</div>
	{/if}

	<div class="space-y-2">
		<h3 class="px-1 text-sm font-medium text-zinc-300">Letzte Nächte</h3>
		{#if liste.length === 0}
			<p class="px-1 text-sm text-zinc-500">Noch keine Einträge.</p>
		{/if}
		<div class="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
			{#each liste as e (e.id)}
				<div class="card flex items-center justify-between gap-3 p-3.5">
					<div>
						<p class="text-sm font-medium text-zinc-100">
							{datumText(e.date)} · {dauerText(e.bedTime, e.wakeTime)}
						</p>
						<p class="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
							{e.bedTime}–{e.wakeTime}
							<span class="flex gap-0.5 text-amber-300/80">
								{#each Array(e.quality) as _, i (i)}
									<Icon name="star" class="h-3 w-3" filled />
								{/each}
							</span>
							{#if e.note}· {e.note}{/if}
						</p>
					</div>
					<div class="flex shrink-0 gap-2 text-zinc-600">
						<button
							type="button"
							onclick={() => bearbeiten(e)}
							aria-label="Bearbeiten"
							class="transition-colors hover:text-zinc-300"
						>
							<Icon name="pencil" class="h-4 w-4" />
						</button>
						<button
							type="button"
							onclick={() => deleteSleepEntry(e.id)}
							aria-label="Löschen"
							class="transition-colors hover:text-rose-400"
						>
							<Icon name="x" class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
