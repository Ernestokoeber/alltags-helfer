<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addBucketItem, allBucketItems, toggleBucketDone, deleteBucketItem } from '$lib/db/bucket';
	import type { BucketItem } from '$lib/db/types';

	let liste = $state<BucketItem[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allBucketItems()).subscribe((v) => (liste = v));
		return () => sub.unsubscribe();
	});

	let titel = $state('');
	async function anlegen() {
		if (titel.trim()) {
			await addBucketItem({ title: titel });
			titel = '';
		}
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-semibold">Bucketlist</h2>

	<div class="flex gap-2">
		<input
			bind:value={titel}
			placeholder="Was möchtest du erleben?"
			onkeydown={(e) => {
				if (e.key === 'Enter') anlegen();
			}}
			class="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		/>
		<button
			type="button"
			onclick={anlegen}
			disabled={!titel.trim()}
			class="shrink-0 rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-30"
		>
			+
		</button>
	</div>

	<div class="space-y-2">
		{#if liste.length === 0}
			<p class="px-1 text-sm text-stone-400">Noch nichts auf deiner Liste.</p>
		{/if}
		{#each liste as b (b.id)}
			<div class="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
				<button
					type="button"
					onclick={() => toggleBucketDone(b.id, !b.done)}
					aria-label="Erledigt umschalten"
					class="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs {b.done
						? 'border-teal-500 bg-teal-500 text-white'
						: 'border-stone-300 text-transparent'}"
				>
					✓
				</button>
				<span class="flex-1 text-sm {b.done ? 'text-stone-400 line-through' : 'text-stone-800'}">
					{b.title}
				</span>
				<button
					type="button"
					onclick={() => deleteBucketItem(b.id)}
					aria-label="Löschen"
					class="shrink-0 text-stone-300 hover:text-rose-500">✕</button
				>
			</div>
		{/each}
	</div>
</section>
