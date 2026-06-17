<script lang="ts">
	import { liveQuery } from 'dexie';
	import { upcomingAppointments } from '$lib/db/appointments';
	import { filterBySphere, categoryBadge, categoryLabel } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import { relativeDayLabel } from '$lib/format';
	import type { Appointment } from '$lib/db/types';
	import Icon from './Icon.svelte';

	// Wiederverwendbares Panel: anstehende Termine der aktiven Sphäre.
	let { limit = 6, compact = false }: { limit?: number; compact?: boolean } = $props();

	let alle = $state<Appointment[]>([]);
	$effect(() => {
		const sub = liveQuery(() => upcomingAppointments()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	const liste = $derived(filterBySphere(alle, sphaere.current).slice(0, limit));
</script>

<div class="card {compact ? 'p-3' : 'p-4'}">
	<h3 class="flex items-center gap-2 {compact ? 'text-xs' : 'text-sm'} font-medium text-zinc-300">
		<Icon name="calendar" class="h-4 w-4 text-zinc-500" /> Anstehende Termine
	</h3>
	{#if liste.length === 0}
		<p class="mt-2 text-xs text-zinc-500">Keine anstehenden Termine.</p>
	{:else}
		<ul class="mt-2 space-y-1.5">
			{#each liste as t (t.id)}
				<li class="min-w-0">
					<div class="flex items-center gap-2">
						<p class="truncate text-xs font-medium text-zinc-100">{t.title}</p>
						<span class="chip shrink-0 px-1.5 py-0 text-[11px] {categoryBadge[t.category]}"
							>{categoryLabel[t.category]}</span
						>
					</div>
					<p class="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
						<Icon name="clock" class="h-3 w-3" />
						{relativeDayLabel(t.startAt)}
						{#if t.location}
							<Icon name="mapPin" class="ml-1 h-3 w-3" />
							{t.location}
						{/if}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>
