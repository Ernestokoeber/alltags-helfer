<script lang="ts">
	import { liveQuery } from 'dexie';
	import { openTasks, erledige } from '$lib/db/notes';
	import { allProjects } from '$lib/db/projects';
	import { filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import { relativeDayLabel } from '$lib/format';
	import type { Note } from '$lib/db/types';
	import Icon from './Icon.svelte';

	// Wiederverwendbares Panel: offene Aufgaben projektübergreifend.
	// limit begrenzt die Zeilen, compact verdichtet Abstände (für die Kontext-Spalte).
	let { limit = 6, compact = false }: { limit?: number; compact?: boolean } = $props();

	let alle = $state<Note[]>([]);
	$effect(() => {
		const sub = liveQuery(() => openTasks()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});

	// Projektnamen für das Projekt-Chip an zugeordneten Aufgaben.
	let projektName = $state<Map<string, string>>(new Map());
	$effect(() => {
		const sub = liveQuery(() => allProjects()).subscribe(
			(v) => (projektName = new Map(v.map((p) => [p.id, p.name])))
		);
		return () => sub.unsubscribe();
	});

	const inSphaere = $derived(filterBySphere(alle, sphaere.current));
	const liste = $derived(inSphaere.slice(0, limit));

	// Offene Aufgabe, deren Frist in der Vergangenheit liegt.
	function ueberfaellig(n: Note): boolean {
		return n.dueAt != null && n.dueAt < Date.now();
	}
</script>

<div class="card {compact ? 'p-3' : 'p-4'}">
	<h3 class="flex items-center gap-2 {compact ? 'text-xs' : 'text-sm'} font-medium text-zinc-300">
		<Icon name="check" class="h-4 w-4 text-zinc-500" /> Offene Aufgaben
		{#if inSphaere.length > 0}<span class="text-zinc-600">({inSphaere.length})</span>{/if}
	</h3>
	{#if liste.length === 0}
		<p class="mt-2 text-xs text-zinc-500">Keine offenen Aufgaben.</p>
	{:else}
		<ul class="mt-2 space-y-1.5">
			{#each liste as n (n.id)}
				<li class="flex items-start gap-2">
					<button
						type="button"
						onclick={() => erledige(n, true)}
						aria-label="Als erledigt markieren"
						class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-zinc-600 text-transparent transition-colors hover:border-emerald-400 hover:text-emerald-300"
					>
						<Icon name="check" class="h-3 w-3" />
					</button>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs text-zinc-100">{n.content}</p>
						<div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
							{#if n.dueAt}
								<span
									class="flex items-center gap-1 {ueberfaellig(n)
										? 'font-medium text-rose-400'
										: 'text-zinc-500'}"
								>
									<Icon name="flag" class="h-3 w-3" />
									{relativeDayLabel(n.dueAt)}{#if ueberfaellig(n)} · überfällig{/if}
								</span>
							{/if}
							{#if n.projectId && projektName.get(n.projectId)}
								<span class="flex items-center gap-1 text-zinc-500">
									<Icon name="folder" class="h-3 w-3" />
									{projektName.get(n.projectId)}
								</span>
							{/if}
							{#if n.recurrence}
								<Icon name="repeat" class="h-3 w-3 text-zinc-500" />
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
