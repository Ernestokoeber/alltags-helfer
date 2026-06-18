<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addAppointment, allAppointments } from '$lib/db/appointments';
	import { pickerProjects, type ProjectOption } from '$lib/db/projects';
	import ProjektSelect from '$lib/components/ProjektSelect.svelte';
	import Kalender from '$lib/components/Kalender.svelte';
	import type { Appointment, Category, Recurrence } from '$lib/db/types';
	import { categoryLabel, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';

	let alle = $state<Appointment[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allAppointments()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	// Termine folgen der globalen Sphäre (Privat/Arbeit/Alles).
	const sichtbar = $derived(filterBySphere(alle, sphaere.current));

	let titel = $state('');
	let wann = $state('');
	let ort = $state('');
	// Kategorie-Vorgabe folgt der aktiven Sphäre.
	let kategorie = $state<Category>(sphaere.current === 'alles' ? 'offen' : sphaere.current);
	$effect(() => {
		kategorie = sphaere.current === 'alles' ? 'offen' : sphaere.current;
	});
	const kategorien: Category[] = ['privat', 'geschaeftlich', 'offen'];

	// Wiederholung (Einmalig = keine).
	let wiederholung = $state<Recurrence | 'none'>('none');
	const wiederholungen: { wert: Recurrence | 'none'; label: string }[] = [
		{ wert: 'none', label: 'Einmalig' },
		{ wert: 'daily', label: 'Täglich' },
		{ wert: 'weekly', label: 'Wöchentlich' },
		{ wert: 'monthly', label: 'Monatlich' }
	];

	// Auswahlbare Projekte (nur Blätter, mit Pfad) für die optionale Zuordnung.
	let projektOptionen = $state<ProjectOption[]>([]);
	$effect(() => {
		const sub = liveQuery(() => pickerProjects()).subscribe((v) => (projektOptionen = v));
		return () => sub.unsubscribe();
	});
	let projektId = $state(''); // '' = kein Projekt

	async function anlegen() {
		const t = titel.trim();
		const ms = wann ? new Date(wann).getTime() : NaN;
		if (!t || Number.isNaN(ms)) return;
		// Mit Projekt folgt die Kategorie dem Projekt, sonst die manuelle Auswahl.
		const proj = projektOptionen.find((p) => p.id === projektId);
		await addAppointment({
			title: t,
			startAt: ms,
			location: ort,
			category: proj?.category ?? kategorie,
			projectId: proj?.id,
			recurrence: wiederholung === 'none' ? undefined : wiederholung
		});
		titel = '';
		wann = '';
		ort = '';
		wiederholung = 'none';
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Termine</h2>

	<div class="card space-y-2.5 p-4 lg:max-w-2xl">
		<input bind:value={titel} placeholder="Titel" class="field" />
		<label class="flex flex-col gap-1 text-xs text-zinc-400">
			Wann
			<input bind:value={wann} type="datetime-local" class="field" />
		</label>
		<input bind:value={ort} placeholder="Ort (optional)" class="field" />
		<ProjektSelect bind:value={projektId} options={projektOptionen} label="Projekt für Termin" />

		<!-- Wiederholung -->
		<div class="flex flex-col gap-1 text-xs text-zinc-400">
			<span>Wiederholung</span>
			<div class="flex flex-wrap gap-1" role="group" aria-label="Wiederholung wählen">
				{#each wiederholungen as w (w.wert)}
					<button
						type="button"
						onclick={() => (wiederholung = w.wert)}
						aria-pressed={wiederholung === w.wert}
						class="chip px-2.5 {wiederholung === w.wert ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}"
					>
						{w.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-between gap-2">
			{#if projektId}
				<span class="text-xs text-zinc-500">Kategorie folgt dem Projekt</span>
			{:else}
				<div class="flex gap-1" role="group" aria-label="Termin-Kategorie wählen">
					{#each kategorien as k (k)}
						<button
							type="button"
							onclick={() => (kategorie = k)}
							aria-pressed={kategorie === k}
							class="chip px-2.5 {kategorie === k ? categoryChipActive[k] : 'chip-idle'}"
						>
							{categoryLabel[k]}
						</button>
					{/each}
				</div>
			{/if}
			<button type="button" onclick={anlegen} disabled={!titel.trim() || !wann} class="btn-primary">
				Anlegen
			</button>
		</div>
	</div>

	<Kalender termine={sichtbar} />
</section>
