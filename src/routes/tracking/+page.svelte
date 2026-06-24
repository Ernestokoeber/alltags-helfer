<script lang="ts">
	// Tracking-Tab: manuelle Zeit-/Lern-Erfassung + Dashboard (Tag/Woche/Fach/Streak).
	// Eigene Analysesicht — ignoriert bewusst den globalen Sphärenfilter; bietet
	// stattdessen einen Fach-Filter. Lern-App-Einträge (P7 Etappe 2) erscheinen hier
	// automatisch über den Sync (Quelle 'pruefungstrainer').
	import { liveQuery } from 'dexie';
	import {
		addTimeEntry,
		allTimeEntries,
		updateTimeEntry,
		deleteTimeEntry,
		eintragNotiz
	} from '$lib/db/timeEntries';
	import {
		dauerMinuten,
		minutenHeute,
		minutenDieseWoche,
		proFach,
		letzteTage,
		streak
	} from '$lib/tracking';
	import type { Category, TimeEntry } from '$lib/db/types';
	import { categoryLabel, categoryBadge, categoryChipActive } from '$lib/sphere';
	import Icon from '$lib/components/Icon.svelte';

	// Live-Daten + tickende Uhr (Streak/Heute/Woche bleiben aktuell).
	let alle = $state<TimeEntry[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allTimeEntries()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(id);
	});

	// --- Erfassung ---
	const FAECHER = ['AP1', 'AP2', 'Security+', 'Cloud+'];
	function heuteISO(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}
	let fach = $state('');
	let datum = $state(heuteISO());
	let dauer = $state<number | null>(null); // Minuten
	let kategorie = $state<Category>('privat');
	let notiz = $state('');
	const kategorien: Category[] = ['privat', 'geschaeftlich', 'offen'];

	async function speichern() {
		const min = dauer ?? 0;
		if (!fach.trim() || !datum || min <= 0) return;
		const start = new Date(`${datum}T12:00:00`).getTime(); // Mittag → kein Tageswechsel-Rand
		const ok = await addTimeEntry({
			activity: fach,
			category: kategorie,
			startedAt: start,
			endedAt: start + min * 60_000,
			note: notiz
		});
		if (ok) {
			fach = '';
			dauer = null;
			notiz = '';
		}
	}

	// --- Filter + abgeleitete Auswertungen ---
	let filterFach = $state('alle');
	const faecher = $derived(proFach(alle).map((f) => f.fach));
	const sichtbar = $derived(
		filterFach !== 'alle' && faecher.includes(filterFach)
			? alle.filter((e) => e.activity === filterFach)
			: alle
	);
	const heuteMin = $derived(minutenHeute(sichtbar, now));
	const wocheMin = $derived(minutenDieseWoche(sichtbar, now));
	const strk = $derived(streak(sichtbar, now));
	const tage = $derived(letzteTage(sichtbar, 7, now));
	const maxTag = $derived(Math.max(1, ...tage.map((t) => t.minuten)));
	const verteilung = $derived(proFach(sichtbar));
	const maxFach = $derived(Math.max(1, ...verteilung.map((f) => f.minuten)));

	// --- Inline-Bearbeitung ---
	let editId = $state<string | null>(null);
	let eFach = $state('');
	let eDauer = $state<number | null>(null);
	let eKat = $state<Category>('privat');
	let eNotiz = $state('');
	function starteEdit(e: TimeEntry) {
		editId = e.id;
		eFach = e.activity;
		eDauer = dauerMinuten(e);
		eKat = e.category;
		eNotiz = eintragNotiz(e) ?? '';
	}
	async function speichereEdit(e: TimeEntry) {
		const min = eDauer ?? 0;
		if (!eFach.trim() || min <= 0) return;
		await updateTimeEntry(e.id, {
			activity: eFach,
			category: eKat,
			endedAt: e.startedAt + min * 60_000, // Dauer ändern, Startzeit behalten
			note: eNotiz
		});
		editId = null;
	}

	// --- Formatierung ---
	function minFmt(min: number): string {
		const h = Math.floor(min / 60);
		const m = min % 60;
		if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
		return `${m} min`;
	}
	function datumLabel(ms: number): string {
		return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
	}
	function wochentag(ms: number): string {
		return new Date(ms).toLocaleDateString('de-DE', { weekday: 'short' });
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Tracking</h2>

	<!-- Erfassung -->
	<div class="card space-y-2.5 p-4 lg:max-w-2xl">
		<div class="flex flex-wrap gap-1" role="group" aria-label="Fach wählen">
			{#each FAECHER as f (f)}
				<button
					type="button"
					onclick={() => (fach = f)}
					aria-pressed={fach === f}
					class="chip px-2.5 {fach === f ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}">{f}</button
				>
			{/each}
		</div>
		<input bind:value={fach} placeholder="Fach / Aktivität" class="field" />

		<div class="flex flex-wrap items-center gap-2">
			<label class="flex items-center gap-1.5 text-xs text-zinc-400">
				<Icon name="calendar" class="h-3.5 w-3.5" /> Datum
				<input bind:value={datum} type="date" aria-label="Datum" class="field py-1" />
			</label>
			<label class="flex items-center gap-1.5 text-xs text-zinc-400">
				<Icon name="clock" class="h-3.5 w-3.5" /> Minuten
				<input
					bind:value={dauer}
					type="number"
					min="1"
					placeholder="z. B. 45"
					aria-label="Dauer in Minuten"
					class="field w-24 py-1"
				/>
			</label>
		</div>

		<div class="flex flex-wrap gap-1" role="group" aria-label="Kategorie wählen">
			{#each kategorien as k (k)}
				<button
					type="button"
					onclick={() => (kategorie = k)}
					aria-pressed={kategorie === k}
					class="chip px-2.5 {kategorie === k ? categoryChipActive[k] : 'chip-idle'}"
					>{categoryLabel[k]}</button
				>
			{/each}
		</div>

		<input bind:value={notiz} placeholder="Notiz (optional)" class="field" />

		<div class="flex justify-end">
			<button
				type="button"
				onclick={speichern}
				disabled={!fach.trim() || !datum || !dauer || dauer <= 0}
				class="btn-primary">Eintrag speichern</button
			>
		</div>
	</div>

	{#if alle.length === 0}
		<p class="px-1 text-sm text-zinc-500">Noch nichts erfasst.</p>
	{:else}
		<!-- Kennzahlen -->
		<div class="grid grid-cols-3 gap-2 lg:max-w-2xl">
			<div class="card p-3.5 text-center">
				<p class="text-xs text-zinc-500">Heute</p>
				<p class="mt-0.5 text-lg font-semibold text-zinc-100">{minFmt(heuteMin)}</p>
			</div>
			<div class="card p-3.5 text-center">
				<p class="text-xs text-zinc-500">Diese Woche</p>
				<p class="mt-0.5 text-lg font-semibold text-zinc-100">{minFmt(wocheMin)}</p>
			</div>
			<div class="card p-3.5 text-center">
				<p class="text-xs text-zinc-500">Streak</p>
				<p class="mt-0.5 text-lg font-semibold text-zinc-100">
					{strk}<span class="text-xs font-normal text-zinc-500"> Tag{strk === 1 ? '' : 'e'}</span>
				</p>
			</div>
		</div>

		<!-- Balken: letzte 7 Tage -->
		<div class="card p-4 lg:max-w-2xl">
			<p class="mb-3 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
				<Icon name="chart" class="h-3.5 w-3.5 text-teal-300" /> Letzte 7 Tage
			</p>
			<div class="flex h-28 items-end justify-between gap-1.5">
				{#each tage as t (t.tag)}
					<div class="flex flex-1 flex-col items-center gap-1">
						<div class="flex w-full flex-1 items-end">
							<div
								class="w-full rounded-t bg-gradient-to-t from-teal-500/40 to-teal-300/70"
								style="height: {Math.round((t.minuten / maxTag) * 100)}%"
								title={minFmt(t.minuten)}
							></div>
						</div>
						<span class="text-[10px] text-zinc-500">{wochentag(t.ms)}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Aufschlüsselung pro Fach (zugleich Filter) -->
		<div class="space-y-2 lg:max-w-2xl">
			<div class="flex flex-wrap items-center gap-1 px-1" role="group" aria-label="Nach Fach filtern">
				<span class="mr-1 text-xs text-zinc-500">Filter:</span>
				<button
					type="button"
					onclick={() => (filterFach = 'alle')}
					aria-pressed={filterFach === 'alle'}
					class="chip px-2.5 {filterFach === 'alle' ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}"
					>Alle</button
				>
				{#each faecher as f (f)}
					<button
						type="button"
						onclick={() => (filterFach = f)}
						aria-pressed={filterFach === f}
						class="chip px-2.5 {filterFach === f ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}">{f}</button
					>
				{/each}
			</div>
			{#each verteilung as f (f.fach)}
				<div class="card p-3">
					<div class="mb-1 flex items-center justify-between text-sm">
						<span class="font-medium text-zinc-200">{f.fach}</span>
						<span class="text-xs text-zinc-500">{minFmt(f.minuten)}</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
						<div
							class="h-full rounded-full bg-teal-400/70"
							style="width: {Math.round((f.minuten / maxFach) * 100)}%"
						></div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Einträge -->
		<div class="space-y-2">
			<h3 class="px-1 text-sm font-medium text-zinc-300">Einträge</h3>
			<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
				{#each sichtbar as e (e.id)}
					<div class="card p-3.5">
						{#if editId === e.id}
							<div class="space-y-2">
								<input bind:value={eFach} placeholder="Fach" class="field" />
								<div class="flex items-center gap-2">
									<input
										bind:value={eDauer}
										type="number"
										min="1"
										aria-label="Dauer in Minuten"
										class="field w-24 py-1"
									/>
									<span class="text-xs text-zinc-500">Minuten</span>
								</div>
								<div class="flex flex-wrap gap-1">
									{#each kategorien as k (k)}
										<button
											type="button"
											onclick={() => (eKat = k)}
											aria-pressed={eKat === k}
											class="chip px-2.5 {eKat === k ? categoryChipActive[k] : 'chip-idle'}"
											>{categoryLabel[k]}</button
										>
									{/each}
								</div>
								<input bind:value={eNotiz} placeholder="Notiz (optional)" class="field" />
								<div class="flex justify-end gap-2">
									<button
										type="button"
										onclick={() => (editId = null)}
										class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">Abbrechen</button
									>
									<button
										type="button"
										onclick={() => speichereEdit(e)}
										disabled={!eFach.trim() || !eDauer || eDauer <= 0}
										class="btn-primary">Speichern</button
									>
								</div>
							</div>
						{:else}
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-zinc-100">{e.activity}</p>
									<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
										<span class="font-medium text-zinc-300">{minFmt(dauerMinuten(e))}</span>
										<span>{datumLabel(e.startedAt)}</span>
										<span class="chip px-2 py-0.5 {categoryBadge[e.category]}"
											>{categoryLabel[e.category]}</span
										>
										{#if e.sourceApp === 'pruefungstrainer'}
											<span class="chip bg-teal-400/15 px-2 py-0.5 text-teal-300">Lern-App</span>
										{/if}
									</div>
									{#if eintragNotiz(e)}
										<p class="mt-1.5 text-sm whitespace-pre-wrap text-zinc-300">{eintragNotiz(e)}</p>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<button
										type="button"
										onclick={() => starteEdit(e)}
										aria-label="Bearbeiten"
										class="text-zinc-500 transition-colors hover:text-zinc-200"
									>
										<Icon name="pencil" class="h-4 w-4" />
									</button>
									<button
										type="button"
										onclick={() => deleteTimeEntry(e.id)}
										aria-label="Löschen"
										class="text-zinc-600 transition-colors hover:text-rose-400"
									>
										<Icon name="x" class="h-4 w-4" />
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
