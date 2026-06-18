<script lang="ts">
	// Monats-Kalender für Termine: Raster Mo–So mit farbigen Markern pro Tag,
	// darunter die Termine des gewählten Tages. Wiederkehrende Termine werden für
	// den sichtbaren Bereich aufgefächert (terminInstanzen).
	import { monatsTage, tagKey, gruppiereNachTag, terminInstanzen } from '$lib/calendar';
	import { categoryBadge, categoryLabel } from '$lib/sphere';
	import type { Appointment, Category } from '$lib/db/types';
	import Vorbereitung from './Vorbereitung.svelte';
	import Icon from './Icon.svelte';
	import TerminModal from './TerminModal.svelte';

	let { termine }: { termine: Appointment[] } = $props();

	const DAY = 86_400_000;
	const heute = new Date();
	const heuteKey = tagKey(heute);

	let jahr = $state(heute.getFullYear());
	let monat = $state(heute.getMonth());
	let ausgewaehlt = $state(tagKey(heute));

	const tage = $derived(monatsTage(jahr, monat));
	const von = $derived(tage[0].getTime());
	const bis = $derived(tage[41].getTime() + DAY - 1);
	const proTag = $derived(gruppiereNachTag(terminInstanzen(termine, von, bis)));
	const tagesTermine = $derived(proTag.get(ausgewaehlt) ?? []);
	const monatsName = $derived(
		new Date(jahr, monat, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
	);

	const wochentage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const punktFarbe: Record<Category, string> = {
		privat: 'bg-amber-400',
		geschaeftlich: 'bg-sky-400',
		offen: 'bg-zinc-400'
	};

	function blättern(delta: number) {
		const d = new Date(jahr, monat + delta, 1);
		jahr = d.getFullYear();
		monat = d.getMonth();
	}
	function zuHeute() {
		jahr = heute.getFullYear();
		monat = heute.getMonth();
		ausgewaehlt = heuteKey;
	}
	function zeit(ms: number): string {
		return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}
	function tagLabel(key: string): string {
		const [y, m, t] = key.split('-').map(Number);
		return new Date(y, m - 1, t).toLocaleDateString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: 'long'
		});
	}

	// Geklicktes Vorkommen zum Bearbeiten öffnen — Serien-Datensatz + Vorkommens-Datum.
	let offen = $state<{ appointment: Appointment; occurrenceMs: number } | null>(null);
	function oeffne(instanz: Appointment) {
		const original = termine.find((t) => t.id === instanz.id);
		if (original) offen = { appointment: original, occurrenceMs: instanz.startAt };
	}
</script>

<div class="space-y-3 lg:max-w-2xl">
	<div class="card space-y-2 p-3">
		<!-- Kopf: Monat + Navigation -->
		<div class="flex items-center justify-between">
			<button
				type="button"
				onclick={() => blättern(-1)}
				aria-label="Voriger Monat"
				class="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
			>
				<Icon name="chevronLeft" class="h-4 w-4" />
			</button>
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-zinc-100 capitalize">{monatsName}</span>
				<button
					type="button"
					onclick={zuHeute}
					class="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
					>heute</button
				>
			</div>
			<button
				type="button"
				onclick={() => blättern(1)}
				aria-label="Nächster Monat"
				class="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
			>
				<Icon name="chevronLeft" class="h-4 w-4 rotate-180" />
			</button>
		</div>

		<!-- Wochentage -->
		<div class="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
			{#each wochentage as w (w)}<div>{w}</div>{/each}
		</div>

		<!-- Tage -->
		<div class="grid grid-cols-7 gap-1">
			{#each tage as d (tagKey(d))}
				{@const k = tagKey(d)}
				{@const imMonat = d.getMonth() === monat}
				{@const ts = proTag.get(k) ?? []}
				<button
					type="button"
					onclick={() => (ausgewaehlt = k)}
					class="flex aspect-square flex-col items-center gap-0.5 rounded-lg p-1 text-xs transition-colors
						{k === ausgewaehlt ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/[0.05]'}
						{imMonat ? 'text-zinc-200' : 'text-zinc-600'}"
				>
					<span
						class={k === heuteKey
							? 'grid h-5 w-5 place-items-center rounded-full bg-teal-400 font-semibold text-zinc-950'
							: ''}>{d.getDate()}</span
					>
					{#if ts.length}
						<span class="flex flex-wrap justify-center gap-0.5">
							{#each ts.slice(0, 3) as t (t.id + t.startAt)}
								<span class="h-1 w-1 rounded-full {punktFarbe[t.category]}"></span>
							{/each}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Termine des gewählten Tages -->
	<div class="space-y-2">
		<h3 class="px-1 text-sm font-medium text-zinc-300 capitalize">{tagLabel(ausgewaehlt)}</h3>
		{#if tagesTermine.length === 0}
			<p class="px-1 text-sm text-zinc-500">Keine Termine an diesem Tag.</p>
		{:else}
			{#each tagesTermine as t (t.id + t.startAt)}
				<div class="card p-3">
					<button
						type="button"
						onclick={() => oeffne(t)}
						class="-m-1 flex w-full items-start justify-between gap-3 rounded-lg p-1 text-left transition-colors hover:bg-white/[0.04]"
					>
						<span class="min-w-0">
							<span class="flex items-center gap-2">
								<span class="truncate text-sm font-medium text-zinc-100">{t.title}</span>
								<span class="chip shrink-0 px-2 py-0.5 {categoryBadge[t.category]}"
									>{categoryLabel[t.category]}</span
								>
							</span>
							<span class="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
								<Icon name="clock" class="h-3.5 w-3.5" />
								{zeit(t.startAt)}
								{#if t.recurrence}<Icon name="repeat" class="ml-1 h-3.5 w-3.5" />{/if}
								{#if t.location}
									<Icon name="mapPin" class="ml-1 h-3.5 w-3.5" />
									{t.location}
								{/if}
							</span>
						</span>
						<Icon name="pencil" class="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
					</button>
					{#if !t.recurrence}
						<Vorbereitung appointmentId={t.id} />
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

{#if offen}
	<TerminModal
		appointment={offen.appointment}
		occurrenceMs={offen.occurrenceMs}
		onClose={() => (offen = null)}
	/>
{/if}
