<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addAppointment, upcomingAppointments, deleteAppointment } from '$lib/db/appointments';
	import { pickerProjects, type ProjectOption } from '$lib/db/projects';
	import Vorbereitung from '$lib/components/Vorbereitung.svelte';
	import ProjektSelect from '$lib/components/ProjektSelect.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { Appointment, Category } from '$lib/db/types';
	import { categoryLabel, categoryBadge, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';

	let alle = $state<Appointment[]>([]);
	$effect(() => {
		const sub = liveQuery(() => upcomingAppointments()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	// Termine folgen der globalen Sphäre (Privat/Arbeit/Alles).
	const liste = $derived(filterBySphere(alle, sphaere.current));

	let titel = $state('');
	let wann = $state('');
	let ort = $state('');
	// Kategorie-Vorgabe folgt der aktiven Sphäre.
	let kategorie = $state<Category>(sphaere.current === 'alles' ? 'offen' : sphaere.current);
	$effect(() => {
		kategorie = sphaere.current === 'alles' ? 'offen' : sphaere.current;
	});
	const kategorien: Category[] = ['privat', 'geschaeftlich', 'offen'];

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
			projectId: proj?.id
		});
		titel = '';
		wann = '';
		ort = '';
	}

	function fmt(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Termine</h2>

	<div class="card space-y-2.5 p-4">
		<input bind:value={titel} placeholder="Titel" class="field" />
		<label class="flex flex-col gap-1 text-xs text-zinc-400">
			Wann
			<input bind:value={wann} type="datetime-local" class="field" />
		</label>
		<input bind:value={ort} placeholder="Ort (optional)" class="field" />
		<ProjektSelect bind:value={projektId} options={projektOptionen} label="Projekt für Termin" />
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
			<button
				type="button"
				onclick={anlegen}
				disabled={!titel.trim() || !wann}
				class="btn-primary"
			>
				Anlegen
			</button>
		</div>
	</div>

	<div class="space-y-2">
		<h3 class="px-1 text-sm font-medium text-zinc-300">Anstehend</h3>
		{#if liste.length === 0}
			<p class="px-1 text-sm text-zinc-500">Keine anstehenden Termine in dieser Sicht.</p>
		{/if}
		{#each liste as t (t.id)}
			<div class="card p-3.5">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<p class="truncate text-sm font-medium text-zinc-100">{t.title}</p>
							<span class="chip shrink-0 px-2 py-0.5 {categoryBadge[t.category]}"
								>{categoryLabel[t.category]}</span
							>
						</div>
						<p class="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
							<Icon name="clock" class="h-3.5 w-3.5" />
							{fmt(t.startAt)}
							{#if t.location}
								<Icon name="mapPin" class="ml-1 h-3.5 w-3.5" />
								{t.location}
							{/if}
						</p>
					</div>
					<button
						type="button"
						onclick={() => deleteAppointment(t.id)}
						aria-label="Löschen"
						class="shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
					>
						<Icon name="x" class="h-4 w-4" />
					</button>
				</div>
				<Vorbereitung appointmentId={t.id} />
			</div>
		{/each}
	</div>
</section>
