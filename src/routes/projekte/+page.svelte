<script lang="ts">
	import { liveQuery } from 'dexie';
	import {
		addProject,
		allProjects,
		setProjectArchived,
		deleteProject,
		notesForProject,
		noteCountByProject
	} from '$lib/db/projects';
	import { addNote, softDeleteNote } from '$lib/db/notes';
	import type { Category, Note, Project } from '$lib/db/types';
	import { categoryLabel, categoryBadge, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import Icon from '$lib/components/Icon.svelte';

	// Projektliste folgt der globalen Sphäre.
	let alle = $state<Project[]>([]);
	let anzahl = $state<Map<string, number>>(new Map());
	$effect(() => {
		const sub = liveQuery(() => allProjects()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	$effect(() => {
		const sub = liveQuery(() => noteCountByProject()).subscribe((v) => (anzahl = v));
		return () => sub.unsubscribe();
	});
	const liste = $derived(filterBySphere(alle, sphaere.current));

	// Master/Detail auf einer Seite: gewähltes Projekt wird aufgeklappt.
	let offenId = $state<string | null>(null);
	const offen = $derived(alle.find((p) => p.id === offenId) ?? null);

	// Notizen des geöffneten Projekts (live).
	let projektNotizen = $state<Note[]>([]);
	$effect(() => {
		if (!offenId) {
			projektNotizen = [];
			return;
		}
		const id = offenId;
		const sub = liveQuery(() => notesForProject(id)).subscribe((v) => (projektNotizen = v));
		return () => sub.unsubscribe();
	});

	// Neues Projekt
	let name = $state('');
	let beschreibung = $state('');
	let kategorie = $state<Category>('geschaeftlich');
	const kategorien: Category[] = ['geschaeftlich', 'privat', 'offen'];

	async function anlegen() {
		const n = name.trim();
		if (!n) return;
		const p = await addProject({ name: n, description: beschreibung, category: kategorie });
		name = '';
		beschreibung = '';
		kategorie = 'geschaeftlich';
		offenId = p.id; // direkt hineinspringen — die erste Notiz folgt meist sofort
	}

	// Schnelle Projekt-Notiz: erbt die Kategorie des Projekts.
	let notizText = $state('');
	async function notizSpeichern() {
		const inhalt = notizText.trim();
		if (!inhalt || !offen) return;
		await addNote({ content: inhalt, category: offen.category, projectId: offen.id });
		notizText = '';
	}

	async function projektLoeschen(id: string) {
		await deleteProject(id);
		if (offenId === id) offenId = null;
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
	{#if offen}
		<!-- Detail: ein Projekt mit seinen Notizen -->
		<button
			type="button"
			onclick={() => (offenId = null)}
			class="flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
		>
			<Icon name="chevronLeft" class="h-4 w-4" /> Alle Projekte
		</button>

		<div class="card p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h2 class="truncate text-xl font-bold tracking-tight">{offen.name}</h2>
					{#if offen.description}
						<p class="mt-0.5 text-xs text-zinc-400">{offen.description}</p>
					{/if}
				</div>
				<span class="chip shrink-0 px-2 py-0.5 {categoryBadge[offen.category]}"
					>{categoryLabel[offen.category]}</span
				>
			</div>
			{#if offen.archived}
				<p class="mt-2 text-xs text-zinc-500">Archiviert — Notizen bleiben erhalten.</p>
			{/if}
		</div>

		<div class="card p-4">
			<h3 class="flex items-center gap-2 text-sm font-medium text-zinc-300">
				<Icon name="note" class="h-4 w-4 text-zinc-500" /> Notiz zu diesem Projekt
			</h3>
			<textarea
				bind:value={notizText}
				rows="2"
				placeholder="Was gibt es Neues im Projekt?"
				class="field mt-2.5 resize-none"
			></textarea>
			<div class="mt-2.5 flex justify-end">
				<button
					type="button"
					onclick={notizSpeichern}
					disabled={!notizText.trim()}
					class="btn-primary"
				>
					Speichern
				</button>
			</div>
		</div>

		<div class="space-y-2">
			<h3 class="px-1 text-sm font-medium text-zinc-300">
				Projekt-Notizen {#if projektNotizen.length > 0}({projektNotizen.length}){/if}
			</h3>
			{#if projektNotizen.length === 0}
				<p class="px-1 text-sm text-zinc-500">Noch keine Notizen in diesem Projekt.</p>
			{/if}
			{#each projektNotizen as n (n.id)}
				<div class="card p-3.5">
					<div class="flex items-start justify-between gap-3">
						<p class="text-sm whitespace-pre-wrap text-zinc-100">{n.content}</p>
						<button
							type="button"
							onclick={() => softDeleteNote(n.id)}
							aria-label="Notiz löschen"
							class="shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
						>
							<Icon name="x" class="h-4 w-4" />
						</button>
					</div>
					<p class="mt-1.5 text-xs text-zinc-500">{datumZeit(n.createdAt)}</p>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Master: Projektliste + Anlegen -->
		<h2 class="text-2xl font-bold tracking-tight">Projekte</h2>

		<div class="card space-y-2.5 p-4">
			<input
				bind:value={name}
				placeholder="Projektname"
				onkeydown={(e) => {
					if (e.key === 'Enter') anlegen();
				}}
				class="field"
			/>
			<input bind:value={beschreibung} placeholder="Beschreibung (optional)" class="field" />
			<div class="flex items-center justify-between gap-2">
				<div class="flex gap-1" role="group" aria-label="Projekt-Kategorie wählen">
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
				<button type="button" onclick={anlegen} disabled={!name.trim()} class="btn-primary">
					Anlegen
				</button>
			</div>
		</div>

		{#if liste.length === 0}
			<p class="px-1 text-sm text-zinc-500">
				Noch keine Projekte in dieser Sicht — leg oben dein erstes an.
			</p>
		{/if}

		<div class="space-y-2">
			{#each liste as p (p.id)}
				<div class="card flex items-center gap-3 p-3.5 {p.archived ? 'opacity-60' : ''}">
					<button
						type="button"
						onclick={() => (offenId = p.id)}
						class="flex min-w-0 flex-1 items-center gap-3 text-left"
					>
						<span
							class="grid h-9 w-9 shrink-0 place-items-center rounded-xl {p.category ===
							'privat'
								? 'bg-amber-400/15 text-amber-300'
								: p.category === 'geschaeftlich'
									? 'bg-sky-400/15 text-sky-300'
									: 'bg-white/[0.06] text-zinc-400'}"
						>
							<Icon name="folder" class="h-4.5 w-4.5" />
						</span>
						<span class="min-w-0">
							<span class="block truncate text-sm font-medium text-zinc-100">{p.name}</span>
							<span class="block text-xs text-zinc-500">
								{anzahl.get(p.id) ?? 0}
								{(anzahl.get(p.id) ?? 0) === 1 ? 'Notiz' : 'Notizen'}
								{#if p.archived}· archiviert{/if}
							</span>
						</span>
					</button>
					<div class="flex shrink-0 gap-2 text-zinc-600">
						<button
							type="button"
							onclick={() => setProjectArchived(p.id, !p.archived)}
							aria-label={p.archived ? 'Wieder aufnehmen' : 'Archivieren'}
							class="transition-colors hover:text-zinc-300"
						>
							<Icon name="archive" class="h-4 w-4" />
						</button>
						<button
							type="button"
							onclick={() => projektLoeschen(p.id)}
							aria-label="Projekt löschen"
							class="transition-colors hover:text-rose-400"
						>
							<Icon name="x" class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
