<script lang="ts">
	// Arbeitsbereich (standalone, nur Arbeit — ignoriert den Sphären-Filter):
	// (1) Kollegen-Notepad für Anrufe/Support, (2) Kundensupport-Log.
	import { untrack } from 'svelte';
	import { liveQuery } from 'dexie';
	import {
		seedColleaguesIfNew,
		addColleague,
		allColleagues,
		deleteColleague,
		addColleagueNote,
		allColleagueNotes,
		setColleagueNoteDone,
		deleteColleagueNote
	} from '$lib/db/colleagues';
	import {
		addSupportCase,
		allSupportCases,
		updateSupportCase,
		deleteSupportCase
	} from '$lib/db/support';
	import type { Colleague, ColleagueNote, SupportCase } from '$lib/db/types';
	import Icon from '$lib/components/Icon.svelte';

	type Bereich = 'kollegen' | 'support';
	let bereich = $state<Bereich>('kollegen');

	// Kollegen beim ersten Laden anlegen (idempotent, feste IDs → kein Sync-Duplikat).
	$effect(() => {
		void seedColleaguesIfNew();
	});

	// --- Kollegen + Notizen (live) ---
	let kollegen = $state<Colleague[]>([]);
	let kollegenNotizen = $state<ColleagueNote[]>([]);
	$effect(() => {
		const subs = [
			liveQuery(() => allColleagues()).subscribe((v) => (kollegen = v)),
			liveQuery(() => allColleagueNotes()).subscribe((v) => (kollegenNotizen = v))
		];
		return () => subs.forEach((s) => s.unsubscribe());
	});
	const kollegenName = $derived(new Map(kollegen.map((k) => [k.id, k.name])));

	let empfaenger = $state(''); // gewählter Kollege (id)
	let notizText = $state('');
	let neuerKollege = $state('');
	let kollegeAddOffen = $state(false);
	let verwalten = $state(false);

	// Gültigen Empfänger sicherstellen (erster Kollege), wenn keiner/ungültig gewählt.
	$effect(() => {
		if (kollegen.length === 0) return;
		const gueltig = kollegen.some((k) => k.id === untrack(() => empfaenger));
		if (!gueltig) empfaenger = kollegen[0].id;
	});

	async function kollegeAnlegen() {
		const c = await addColleague(neuerKollege);
		if (c) empfaenger = c.id;
		neuerKollege = '';
		kollegeAddOffen = false;
	}
	async function notizSpeichern() {
		if (!empfaenger || !notizText.trim()) return;
		await addColleagueNote({ colleagueId: empfaenger, content: notizText });
		notizText = '';
	}

	// --- Kundensupport (live) ---
	let faelle = $state<SupportCase[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allSupportCases()).subscribe((v) => (faelle = v));
		return () => sub.unsubscribe();
	});

	let kunde = $state('');
	let problem = $state('');
	let loesung = $state('');
	async function fallAnlegen() {
		if (!kunde.trim() || !problem.trim()) return;
		await addSupportCase({ customer: kunde, problem, solution: loesung });
		kunde = '';
		problem = '';
		loesung = '';
	}

	// Lösung inline nachtragen/bearbeiten
	let loesungFor = $state<string | null>(null);
	let loesungText = $state('');
	function starteLoesung(f: SupportCase) {
		loesungFor = f.id;
		loesungText = f.solution ?? '';
	}
	async function loesungSpeichern(id: string) {
		await updateSupportCase(id, { solution: loesungText });
		loesungFor = null;
		loesungText = '';
	}

	function datumZeit(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Arbeit</h2>

	<!-- Bereich-Umschalter -->
	<div class="inline-flex rounded-full border border-white/10 bg-white/[0.05] p-1">
		<button
			type="button"
			onclick={() => (bereich = 'kollegen')}
			aria-pressed={bereich === 'kollegen'}
			class="rounded-full px-3 py-1.5 text-sm font-semibold transition-colors {bereich === 'kollegen'
				? 'bg-zinc-100 text-zinc-900'
				: 'text-zinc-400 hover:text-zinc-200'}">Kollegen-Notizen</button
		>
		<button
			type="button"
			onclick={() => (bereich = 'support')}
			aria-pressed={bereich === 'support'}
			class="rounded-full px-3 py-1.5 text-sm font-semibold transition-colors {bereich === 'support'
				? 'bg-zinc-100 text-zinc-900'
				: 'text-zinc-400 hover:text-zinc-200'}">Kundensupport</button
		>
	</div>

	{#if bereich === 'kollegen'}
		<!-- Notiz für einen Kollegen -->
		<div class="card space-y-2.5 p-4 lg:max-w-2xl">
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<span class="text-xs text-zinc-400">Für wen?</span>
					<button
						type="button"
						onclick={() => (verwalten = !verwalten)}
						class="text-xs text-zinc-500 transition-colors hover:text-zinc-200"
						>{verwalten ? 'fertig' : 'verwalten'}</button
					>
				</div>
				<div class="flex flex-wrap items-center gap-1">
					{#each kollegen as k (k.id)}
						<span class="inline-flex items-center">
							<button
								type="button"
								onclick={() => (empfaenger = k.id)}
								aria-pressed={empfaenger === k.id}
								class="chip px-2.5 {empfaenger === k.id ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}"
								>{k.name}</button
							>
							{#if verwalten}
								<button
									type="button"
									onclick={() => deleteColleague(k.id)}
									aria-label="{k.name} entfernen"
									class="ml-0.5 text-zinc-500 transition-colors hover:text-rose-400"
								>
									<Icon name="x" class="h-3.5 w-3.5" />
								</button>
							{/if}
						</span>
					{/each}
					{#if kollegeAddOffen}
						<input
							bind:value={neuerKollege}
							placeholder="Name"
							onkeydown={(e) => e.key === 'Enter' && kollegeAnlegen()}
							class="w-28 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-100 outline-none focus:border-teal-300/50"
						/>
						<button type="button" onclick={kollegeAnlegen} class="chip bg-zinc-100 px-2.5 text-zinc-900"
							>OK</button
						>
					{:else}
						<button
							type="button"
							onclick={() => {
								kollegeAddOffen = true;
								neuerKollege = '';
							}}
							class="chip chip-idle px-2.5">+ Kollege</button
						>
					{/if}
				</div>
			</div>
			<textarea
				bind:value={notizText}
				rows="2"
				placeholder="Notiz für den Kollegen (z. B. Rückruf an Kunde XY …)"
				class="field resize-none"
			></textarea>
			<div class="flex justify-end">
				<button
					type="button"
					onclick={notizSpeichern}
					disabled={!empfaenger || !notizText.trim()}
					class="btn-primary">Notiz speichern</button
				>
			</div>
		</div>

		<!-- Liste der Kollegen-Notizen -->
		<div class="space-y-2">
			{#if kollegenNotizen.length === 0}
				<p class="px-1 text-sm text-zinc-500">Noch keine Notizen.</p>
			{/if}
			<div class="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
				{#each kollegenNotizen as n (n.id)}
					<div class="card p-3.5 {n.done ? 'opacity-60' : ''}">
						<div class="flex items-start gap-3">
							<button
								type="button"
								onclick={() => setColleagueNoteDone(n.id, !n.done)}
								aria-label={n.done ? 'Wieder offen' : 'Als erledigt markieren'}
								class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors {n.done
									? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
									: 'border-zinc-600 text-transparent hover:border-zinc-400'}"
							>
								<Icon name="check" class="h-3.5 w-3.5" />
							</button>
							<div class="min-w-0 flex-1">
								<p
									class="text-sm whitespace-pre-wrap {n.done
										? 'text-zinc-400 line-through'
										: 'text-zinc-100'}"
								>
									{n.content}
								</p>
								<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
									<span class="chip bg-white/[0.06] px-2 py-0.5 text-zinc-300"
										>für {kollegenName.get(n.colleagueId) ?? '—'}</span
									>
									<span>{datumZeit(n.createdAt)}</span>
								</div>
							</div>
							<button
								type="button"
								onclick={() => deleteColleagueNote(n.id)}
								aria-label="Löschen"
								class="mt-0.5 shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
							>
								<Icon name="x" class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Kundensupport-Fall anlegen -->
		<div class="card space-y-2.5 p-4 lg:max-w-2xl">
			<input bind:value={kunde} placeholder="Kunde" class="field" />
			<textarea bind:value={problem} rows="2" placeholder="Problem" class="field resize-none"></textarea>
			<textarea
				bind:value={loesung}
				rows="2"
				placeholder="Lösung (optional — kann später nachgetragen werden)"
				class="field resize-none"
			></textarea>
			<div class="flex justify-end">
				<button
					type="button"
					onclick={fallAnlegen}
					disabled={!kunde.trim() || !problem.trim()}
					class="btn-primary">Fall anlegen</button
				>
			</div>
		</div>

		<!-- Fallliste -->
		<div class="space-y-2">
			{#if faelle.length === 0}
				<p class="px-1 text-sm text-zinc-500">Noch keine Support-Fälle.</p>
			{/if}
			<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
				{#each faelle as f (f.id)}
					<div class="card p-3.5 {f.status === 'geloest' ? 'opacity-70' : ''}">
						<div class="flex items-start justify-between gap-2">
							<p class="min-w-0 truncate text-sm font-semibold text-zinc-100">{f.customer}</p>
							<div class="flex shrink-0 items-center gap-2">
								<span
									class="chip px-2 py-0.5 text-[10px] {f.status === 'geloest'
										? 'bg-emerald-400/15 text-emerald-300'
										: 'bg-amber-400/15 text-amber-300'}">{f.status === 'geloest' ? 'gelöst' : 'offen'}</span
								>
								<button
									type="button"
									onclick={() => deleteSupportCase(f.id)}
									aria-label="Löschen"
									class="text-zinc-600 transition-colors hover:text-rose-400"
								>
									<Icon name="x" class="h-4 w-4" />
								</button>
							</div>
						</div>
						<p class="mt-1 text-sm whitespace-pre-wrap text-zinc-300">
							<span class="text-zinc-500">Problem:</span>
							{f.problem}
						</p>
						{#if f.solution}
							<p class="mt-1 text-sm whitespace-pre-wrap text-zinc-300">
								<span class="text-zinc-500">Lösung:</span>
								{f.solution}
							</p>
						{/if}

						{#if loesungFor === f.id}
							<div class="mt-2 space-y-2">
								<textarea
									bind:value={loesungText}
									rows="2"
									placeholder="Wie wurde es gelöst?"
									class="field resize-none"
								></textarea>
								<div class="flex justify-end gap-2">
									<button
										type="button"
										onclick={() => (loesungFor = null)}
										class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">Abbrechen</button
									>
									<button type="button" onclick={() => loesungSpeichern(f.id)} class="btn-primary"
										>Speichern</button
									>
								</div>
							</div>
						{:else}
							<div class="mt-2 flex justify-end">
								<button
									type="button"
									onclick={() => starteLoesung(f)}
									class="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
								>
									<Icon name="pencil" class="h-3.5 w-3.5" />
									{f.solution ? 'Lösung bearbeiten' : 'Lösung nachtragen'}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
