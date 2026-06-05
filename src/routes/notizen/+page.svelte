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
	import type { Category, Note } from '$lib/db/types';
	import KategorieVorschlag from '$lib/components/KategorieVorschlag.svelte';

	// Live-Liste aller aktiven Notizen — aktualisiert sich bei jeder DB-Änderung.
	let alle = $state<Note[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allNotes()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});

	// Suche filtert clientseitig über Inhalt und Tags.
	let suche = $state('');
	const gefiltert = $derived.by(() => {
		const q = suche.trim().toLowerCase();
		if (!q) return alle;
		return alle.filter(
			(n) => n.content.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q))
		);
	});

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
	const catLabel: Record<Category, string> = {
		privat: 'Privat',
		geschaeftlich: 'Geschäftlich',
		offen: 'Offen'
	};
	const catStyle: Record<Category, string> = {
		privat: 'bg-teal-100 text-teal-700',
		geschaeftlich: 'bg-indigo-100 text-indigo-700',
		offen: 'bg-stone-100 text-stone-500'
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
	<h2 class="text-2xl font-semibold">Notizen</h2>

	<input
		bind:value={suche}
		type="search"
		placeholder="Suchen (Inhalt oder Tag) …"
		class="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none
			focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
	/>

	{#if gefiltert.length === 0}
		<p class="px-1 text-sm text-stone-400">
			{suche.trim() ? 'Keine Treffer.' : 'Noch keine Notizen — leg in „Heute“ welche an.'}
		</p>
	{/if}

	<div class="space-y-2">
		{#each gefiltert as n (n.id)}
			<div class="rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
				{#if editId === n.id}
					<textarea
						bind:value={editText}
						rows="2"
						class="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 p-2 text-sm
							outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
					></textarea>
					<div class="mt-2 flex justify-end gap-2 text-sm">
						<button type="button" onclick={() => (editId = null)} class="px-2 py-1 text-stone-500">
							Abbrechen
						</button>
						<button
							type="button"
							onclick={saveEdit}
							class="rounded-full bg-stone-900 px-3 py-1 font-medium text-white"
						>
							Speichern
						</button>
					</div>
				{:else}
					<div class="flex items-start justify-between gap-2">
						<p class="whitespace-pre-wrap text-sm text-stone-800">{n.content}</p>
						<div class="flex shrink-0 gap-1.5 text-stone-300">
							<button
								type="button"
								onclick={() => setPinned(n.id, !n.pinned)}
								aria-label={n.pinned ? 'Pin entfernen' : 'Anpinnen'}
								class={n.pinned ? 'text-amber-500' : 'hover:text-stone-600'}
							>
								📌
							</button>
							<button
								type="button"
								onclick={() => startEdit(n)}
								aria-label="Bearbeiten"
								class="hover:text-stone-600">✎</button
							>
							<button
								type="button"
								onclick={() => softDeleteNote(n.id)}
								aria-label="Löschen"
								class="hover:text-rose-500">✕</button
							>
						</div>
					</div>

					<div class="mt-2 flex flex-wrap items-center gap-1">
						{#each n.tags as t (t)}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
							>
								#{t}
								<button
									type="button"
									onclick={() => removeTag(n.id, t)}
									aria-label="Tag entfernen"
									class="text-stone-400 hover:text-rose-500">×</button
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
								class="w-24 rounded-full border border-stone-200 px-2 py-0.5 text-xs outline-none
									focus:border-teal-400"
							/>
						{:else}
							<button
								type="button"
								onclick={() => {
									tagFor = n.id;
									tagText = '';
								}}
								class="rounded-full px-2 py-0.5 text-xs text-stone-400 hover:text-stone-700">+ Tag</button
							>
						{/if}
					</div>

					<div class="mt-2 flex items-center gap-2 text-xs text-stone-400">
						<button
							type="button"
							onclick={() => setCategory(n.id, naechste[n.category])}
							class="rounded-full px-2 py-0.5 {catStyle[n.category]}"
							title="Kategorie wechseln"
						>
							{catLabel[n.category]}
						</button>
						<span>{datumZeit(n.createdAt)}</span>
					</div>
					<KategorieVorschlag note={n} />
				{/if}
			</div>
		{/each}
	</div>
</section>
