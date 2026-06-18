<script lang="ts">
	import { liveQuery } from 'dexie';
	import { allTasks, erledige, softDeleteNote, addNote, isOpen } from '$lib/db/notes';
	import { allProjects, pickerProjects, type ProjectOption } from '$lib/db/projects';
	import ProjektSelect from '$lib/components/ProjektSelect.svelte';
	import NotizModal from '$lib/components/NotizModal.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { Category, Note, Recurrence } from '$lib/db/types';
	import { categoryLabel, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';

	// Alle Aufgaben projektübergreifend (offen + erledigt), live.
	let alle = $state<Note[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allTasks()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});

	// Projektnamen für das Projekt-Chip.
	let projektName = $state<Map<string, string>>(new Map());
	$effect(() => {
		const sub = liveQuery(() => allProjects()).subscribe(
			(v) => (projektName = new Map(v.map((p) => [p.id, p.name])))
		);
		return () => sub.unsubscribe();
	});

	// Auswählbare Projekte (nur Blätter, mit Pfad) für die Zuordnung.
	let projektOptionen = $state<ProjectOption[]>([]);
	$effect(() => {
		const sub = liveQuery(() => pickerProjects()).subscribe((v) => (projektOptionen = v));
		return () => sub.unsubscribe();
	});

	const inSphaere = $derived(filterBySphere(alle, sphaere.current));
	let zeigeErledigte = $state(false);
	const erledigteAnzahl = $derived(inSphaere.filter((n) => !isOpen(n)).length);
	const sichtbar = $derived(zeigeErledigte ? inSphaere : inSphaere.filter((n) => isOpen(n)));

	// Geöffnete Aufgabe (Modal): live aus der Liste → spiegelt Änderungen, schließt
	// automatisch, wenn die Aufgabe gelöscht wird.
	let offeneId = $state<string | null>(null);
	const offeneNotiz = $derived(offeneId ? (alle.find((n) => n.id === offeneId) ?? null) : null);

	// --- Formular: Aufgabe anlegen ---
	let aufgabeText = $state('');
	let aufgabeFrist = $state(''); // datetime-local
	let aufgabeWdh = $state<Recurrence | 'none'>('none');
	let aufgabeKat = $state<Category>('offen');
	let aufgabeProjekt = $state(''); // '' = kein Projekt

	const kategorien: Category[] = ['privat', 'geschaeftlich', 'offen'];
	const wiederholungen: { wert: Recurrence | 'none'; label: string }[] = [
		{ wert: 'none', label: 'Einmalig' },
		{ wert: 'daily', label: 'Täglich' },
		{ wert: 'weekly', label: 'Wöchentlich' },
		{ wert: 'monthly', label: 'Monatlich' }
	];
	const wdhLabel: Record<Recurrence, string> = {
		daily: 'täglich',
		weekly: 'wöchentlich',
		monthly: 'monatlich'
	};

	async function anlegen() {
		const inhalt = aufgabeText.trim();
		if (!inhalt) return;
		// Mit Projekt erbt die Aufgabe dessen Kategorie, sonst gilt die Auswahl.
		const proj = projektOptionen.find((p) => p.id === aufgabeProjekt);
		const dueAt = aufgabeFrist ? new Date(aufgabeFrist).getTime() : null;
		await addNote({
			content: inhalt,
			category: proj?.category ?? aufgabeKat,
			projectId: proj?.id,
			dueAt,
			recurrence: aufgabeWdh === 'none' ? undefined : aufgabeWdh,
			isTask: true
		});
		aufgabeText = '';
		aufgabeFrist = '';
		aufgabeWdh = 'none';
		aufgabeKat = 'offen';
		aufgabeProjekt = '';
	}

	function datumZeit(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	function ueberfaellig(n: Note): boolean {
		return n.dueAt != null && n.dueAt < Date.now() && isOpen(n);
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Aufgaben</h2>

	<!-- Aufgabe anlegen -->
	<div class="card space-y-2.5 p-4 lg:max-w-2xl">
		<textarea
			bind:value={aufgabeText}
			rows="2"
			placeholder="Was ist zu tun?"
			class="field resize-none"
		></textarea>

		<div class="flex flex-wrap gap-1" role="group" aria-label="Kategorie wählen">
			{#each kategorien as k (k)}
				<button
					type="button"
					onclick={() => (aufgabeKat = k)}
					aria-pressed={aufgabeKat === k}
					class="chip px-2.5 {aufgabeKat === k ? categoryChipActive[k] : 'chip-idle'}"
				>
					{categoryLabel[k]}
				</button>
			{/each}
		</div>

		<div class="flex flex-wrap gap-1" role="group" aria-label="Wiederholung wählen">
			{#each wiederholungen as w (w.wert)}
				<button
					type="button"
					onclick={() => (aufgabeWdh = w.wert)}
					aria-pressed={aufgabeWdh === w.wert}
					class="chip px-2.5 {aufgabeWdh === w.wert ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}"
				>
					{w.label}
				</button>
			{/each}
		</div>

		<label class="flex items-center gap-1.5 text-xs text-zinc-400">
			<Icon name="flag" class="h-3.5 w-3.5" /> Frist (optional)
			<input bind:value={aufgabeFrist} type="datetime-local" aria-label="Frist" class="field py-1" />
		</label>

		<ProjektSelect
			bind:value={aufgabeProjekt}
			options={projektOptionen}
			label="Projekt für Aufgabe"
		/>

		<div class="flex justify-end">
			<button type="button" onclick={anlegen} disabled={!aufgabeText.trim()} class="btn-primary">
				Aufgabe hinzufügen
			</button>
		</div>
	</div>

	{#if erledigteAnzahl > 0}
		<div class="flex justify-end px-1">
			<button
				type="button"
				onclick={() => (zeigeErledigte = !zeigeErledigte)}
				aria-pressed={!zeigeErledigte}
				class="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
			>
				{zeigeErledigte ? `Erledigte ausblenden (${erledigteAnzahl})` : 'Erledigte anzeigen'}
			</button>
		</div>
	{/if}

	<div class="space-y-2">
		{#if sichtbar.length === 0}
			<p class="px-1 text-sm text-zinc-500">
				{inSphaere.length === 0 ? 'Noch keine Aufgaben.' : 'Alles erledigt 🎉'}
			</p>
		{/if}
		<div class="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
			{#each sichtbar as n (n.id)}
				<div class="card p-3.5 {isOpen(n) ? '' : 'opacity-60'}">
					<div class="flex items-start gap-3">
						<button
							type="button"
							onclick={() => erledige(n, isOpen(n))}
							aria-label={isOpen(n) ? 'Als erledigt markieren' : 'Wieder öffnen'}
							class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors {isOpen(
								n
							)
								? 'border-zinc-600 text-transparent hover:border-zinc-400'
								: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'}"
						>
							<Icon name="check" class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onclick={() => (offeneId = n.id)}
							class="min-w-0 flex-1 text-left"
							aria-label="Aufgabe öffnen"
						>
							<span
								class="line-clamp-3 block text-sm whitespace-pre-wrap {isOpen(n)
									? 'text-zinc-100'
									: 'text-zinc-400 line-through'}"
							>
								{n.content}
							</span>
							<span class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
								{#if n.dueAt}
									<span
										class="flex items-center gap-1 {ueberfaellig(n)
											? 'font-medium text-rose-400'
											: 'text-zinc-500'}"
									>
										<Icon name="flag" class="h-3.5 w-3.5" />
										fällig {datumZeit(n.dueAt)}{#if ueberfaellig(n)} · überfällig{/if}
									</span>
								{/if}
								{#if n.projectId && projektName.get(n.projectId)}
									<span class="flex items-center gap-1 text-zinc-500">
										<Icon name="folder" class="h-3.5 w-3.5" />
										{projektName.get(n.projectId)}
									</span>
								{/if}
								{#if n.recurrence}
									<span class="flex items-center gap-1 text-zinc-500">
										<Icon name="repeat" class="h-3.5 w-3.5" /> {wdhLabel[n.recurrence]}
									</span>
								{/if}
								{#if !isOpen(n) && n.completedAt}
									<span class="flex items-center gap-1 text-emerald-400/80">
										<Icon name="check" class="h-3.5 w-3.5" /> erledigt
									</span>
								{/if}
							</span>
						</button>

						<button
							type="button"
							onclick={() => softDeleteNote(n.id)}
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

	{#if offeneNotiz}
		<NotizModal
			note={offeneNotiz}
			projektName={offeneNotiz.projectId ? projektName.get(offeneNotiz.projectId) : undefined}
			onClose={() => (offeneId = null)}
		/>
	{/if}
</section>
