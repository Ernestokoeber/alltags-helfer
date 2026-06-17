<script lang="ts">
	import { liveQuery } from 'dexie';
	import { allNotes } from '$lib/db/notes';
	import { filterBySphere, categoryBadge, categoryLabel } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import type { Note } from '$lib/db/types';
	import Icon from './Icon.svelte';

	// Wiederverwendbares Panel: angepinnte zuerst, dann neueste Notizen
	// (allNotes liefert bereits in dieser Reihenfolge).
	let { limit = 6, compact = false }: { limit?: number; compact?: boolean } = $props();

	let alle = $state<Note[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allNotes()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	const liste = $derived(filterBySphere(alle, sphaere.current).slice(0, limit));

	function tag(ms: number): string {
		return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
	}
</script>

<div class="card {compact ? 'p-3' : 'p-4'}">
	<h3 class="flex items-center gap-2 {compact ? 'text-xs' : 'text-sm'} font-medium text-zinc-300">
		<Icon name="note" class="h-4 w-4 text-zinc-500" /> Notizen
	</h3>
	{#if liste.length === 0}
		<p class="mt-2 text-xs text-zinc-500">Noch keine Notizen.</p>
	{:else}
		<ul class="mt-2 space-y-1.5">
			{#each liste as n (n.id)}
				<li class="min-w-0">
					<div class="flex items-start gap-1.5">
						{#if n.pinned}
							<Icon name="bookmark" class="mt-0.5 h-3 w-3 shrink-0 text-amber-300" filled />
						{/if}
						<p class="line-clamp-2 text-xs text-zinc-100">{n.content}</p>
					</div>
					<div class="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
						<span class="chip px-1.5 py-0 text-[11px] {categoryBadge[n.category]}"
							>{categoryLabel[n.category]}</span
						>
						<span>{tag(n.createdAt)}</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
