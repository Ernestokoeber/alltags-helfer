<script lang="ts">
	import { liveQuery } from 'dexie';
	import {
		allNotes,
		softDeleteNote,
		setPinned,
		setCategory,
		updateNoteContent,
		addTag,
		removeTag
	} from '$lib/db/notes';
	import { allProjects } from '$lib/db/projects';
	import type { Category, Note } from '$lib/db/types';
	import { filterNotes, type CategoryFilter } from '$lib/notes-filter';
	import { categoryLabel, categoryBadge, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import KategorieVorschlag from '$lib/components/KategorieVorschlag.svelte';
	import Icon from '$lib/components/Icon.svelte';

	// Live-Liste aller aktiven Notizen — aktualisiert sich bei jeder DB-Änderung.
	let alle = $state<Note[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allNotes()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});

	// Projektnamen für das Projekt-Chip an zugeordneten Notizen.
	let projektName = $state<Map<string, string>>(new Map());
	$effect(() => {
		const sub = liveQuery(() => allProjects()).subscribe(
			(v) => (projektName = new Map(v.map((p) => [p.id, p.name])))
		);
		return () => sub.unsubscribe();
	});

	// Erst die globale Sphäre, dann Suche + Kategorie-Chips als Feinfilter.
	let suche = $state('');
	let kategorie = $state<CategoryFilter>('alle');
	const inSphaere = $derived(filterBySphere(alle, sphaere.current));
	const gefiltert = $derived(filterNotes(inSphaere, suche, kategorie));

	// Filter-Chips: Reihenfolge + Beschriftung.
	const filterChips: { value: CategoryFilter; label: string }[] = [
		{ value: 'alle', label: 'Alle' },
		{ value: 'privat', label: 'Privat' },
		{ value: 'geschaeftlich', label: 'Arbeit' },
		{ value: 'offen', label: 'Offen' }
	];

	// Bearbeiten-Modus
	let editId = $state<string | null>(null);
	let editText = $state('');
	function startEdit(n: Note) {
		editId = n.id;
		editText = n.content;
	}
	async function saveEdit() {
		if (editId && editText.trim()) await updateNoteContent(editId, editText);
		editId = null;
	}

	// Tag-Eingabe (pro Notiz aufklappbar)
	let tagFor = $state<string | null>(null);
	let tagText = $state('');
	async function tagHinzufuegen(id: string) {
		if (tagText.trim()) await addTag(id, tagText);
		tagText = '';
		tagFor = null;
	}

	// Kategorie per Klick durchschalten
	const naechste: Record<Category, Category> = {
		privat: 'geschaeftlich',
		geschaeftlich: 'offen',
		offen: 'privat'
	};

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
	<h2 class="text-2xl font-bold tracking-tight">Notizen</h2>

	<div class="relative">
		<Icon name="search" class="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-zinc-500" />
		<input
			bind:value={suche}
			type="search"
			placeholder="Suchen (Inhalt oder Tag) …"
			class="field pl-9"
		/>
	</div>

	<div class="flex flex-wrap gap-1.5" role="group" aria-label="Notizen nach Kategorie filtern">
		{#each filterChips as chip (chip.value)}
			<button
				type="button"
				onclick={() => (kategorie = chip.value)}
				aria-pressed={kategorie === chip.value}
				class="chip {kategorie === chip.value ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}"
			>
				{chip.label}
			</button>
		{/each}
	</div>

	{#if gefiltert.length === 0}
		<p class="px-1 text-sm text-zinc-500">
			{suche.trim() || kategorie !== 'alle' || sphaere.current !== 'alles'
				? 'Keine Treffer in dieser Sicht.'
				: 'Noch keine Notizen — leg in „Heute“ welche an.'}
		</p>
	{/if}

	<div class="space-y-2">
		{#each gefiltert as n (n.id)}
			<div class="card p-3.5 {n.pinned ? 'border-amber-400/30' : ''}">
				{#if editId === n.id}
					<textarea bind:value={editText} rows="2" class="field resize-none"></textarea>
					<div class="mt-2 flex justify-end gap-2 text-sm">
						<button
							type="button"
							onclick={() => (editId = null)}
							class="px-2 py-1 text-zinc-400 hover:text-zinc-200"
						>
							Abbrechen
						</button>
						<button type="button" onclick={saveEdit} class="btn-primary px-3 py-1">
							Speichern
						</button>
					</div>
				{:else}
					<div class="flex items-start justify-between gap-2">
						<p class="text-sm whitespace-pre-wrap text-zinc-100">{n.content}</p>
						<div class="flex shrink-0 gap-2 text-zinc-600">
							<button
								type="button"
								onclick={() => setPinned(n.id, !n.pinned)}
								aria-label={n.pinned ? 'Pin entfernen' : 'Anpinnen'}
								class="transition-colors {n.pinned ? 'text-amber-300' : 'hover:text-zinc-300'}"
							>
								<Icon name="bookmark" class="h-4 w-4" filled={n.pinned} />
							</button>
							<button
								type="button"
								onclick={() => startEdit(n)}
								aria-label="Bearbeiten"
								class="transition-colors hover:text-zinc-300"
							>
								<Icon name="pencil" class="h-4 w-4" />
							</button>
							<button
								type="button"
								onclick={() => softDeleteNote(n.id)}
								aria-label="Löschen"
								class="transition-colors hover:text-rose-400"
							>
								<Icon name="x" class="h-4 w-4" />
							</button>
						</div>
					</div>

					<div class="mt-2 flex flex-wrap items-center gap-1">
						{#each n.tags as t (t)}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-300 ring-1 ring-white/10 ring-inset"
							>
								#{t}
								<button
									type="button"
									onclick={() => removeTag(n.id, t)}
									aria-label="Tag entfernen"
									class="text-zinc-500 hover:text-rose-400">×</button
								>
							</span>
						{/each}
						{#if tagFor === n.id}
							<input
								bind:value={tagText}
								placeholder="Tag …"
								onkeydown={(e) => {
									if (e.key === 'Enter') tagHinzufuegen(n.id);
								}}
								class="w-24 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-teal-300/50"
							/>
						{:else}
							<button
								type="button"
								onclick={() => {
									tagFor = n.id;
									tagText = '';
								}}
								class="rounded-full px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-200"
								>+ Tag</button
							>
						{/if}
					</div>

					<div class="mt-2 flex items-center gap-2 text-xs text-zinc-500">
						<button
							type="button"
							onclick={() => setCategory(n.id, naechste[n.category])}
							class="chip px-2 py-0.5 {categoryBadge[n.category]}"
							title="Kategorie wechseln"
						>
							{categoryLabel[n.category]}
						</button>
						{#if n.projectId && projektName.get(n.projectId)}
							<span
								class="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-zinc-400 ring-1 ring-white/10 ring-inset"
							>
								<Icon name="folder" class="h-3 w-3" />
								{projektName.get(n.projectId)}
							</span>
						{/if}
						<span>{datumZeit(n.createdAt)}</span>
					</div>
					<KategorieVorschlag note={n} />
				{/if}
			</div>
		{/each}
	</div>
</section>
