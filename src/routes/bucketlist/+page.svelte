<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addBucketItem, allBucketItems, toggleBucketDone, deleteBucketItem } from '$lib/db/bucket';
	import type { BucketItem, Category } from '$lib/db/types';
	import { categoryLabel, categoryBadge, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let alle = $state<BucketItem[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allBucketItems()).subscribe((v) => (alle = v));
		return () => sub.unsubscribe();
	});
	// Erst die globale Sphäre, dann Erledigte ein-/ausblenden.
	const liste = $derived(filterBySphere(alle, sphaere.current));
	let zeigeErledigte = $state(true);
	const sichtbar = $derived(zeigeErledigte ? liste : liste.filter((b) => !b.done));
	const erledigteAnzahl = $derived(liste.filter((b) => b.done).length);

	// Eingabefelder
	let titel = $state('');
	let beschreibung = $state('');
	let zieldatum = $state(''); // YYYY-MM-DD
	let kategorie = $state<Category>('offen');

	// "YYYY-MM-DD" → lokale Mitternacht (ms); leer → undefined (kein UTC-Versatz).
	function parseDatum(s: string): number | undefined {
		if (!s) return undefined;
		const [y, m, d] = s.split('-').map(Number);
		return new Date(y, m - 1, d).getTime();
	}

	async function anlegen() {
		const t = titel.trim();
		if (!t) return;
		await addBucketItem({
			title: t,
			description: beschreibung,
			targetDate: parseDatum(zieldatum),
			category: kategorie
		});
		titel = '';
		beschreibung = '';
		zieldatum = '';
		kategorie = 'offen';
	}

	function fmtDatum(ms: number): string {
		return new Date(ms).toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-bold tracking-tight">Bucketlist</h2>

	<div class="card space-y-2.5 p-4">
		<input
			bind:value={titel}
			placeholder="Was möchtest du erleben?"
			onkeydown={(e) => {
				if (e.key === 'Enter') anlegen();
			}}
			class="field"
		/>
		<textarea
			bind:value={beschreibung}
			rows="2"
			placeholder="Beschreibung (optional)"
			class="field resize-none"
		></textarea>
		<label class="flex flex-col gap-1 text-xs text-zinc-400">
			Zieldatum (optional)
			<input bind:value={zieldatum} type="date" class="field" />
		</label>
		<div class="flex flex-col gap-1 text-xs text-zinc-400">
			<span>Kategorie</span>
			<div class="flex flex-wrap gap-1.5" role="group" aria-label="Kategorie wählen">
				{#each ['offen', 'privat', 'geschaeftlich'] as const as c (c)}
					<button
						type="button"
						onclick={() => (kategorie = c)}
						aria-pressed={kategorie === c}
						class="chip {kategorie === c ? categoryChipActive[c] : 'chip-idle'}"
					>
						{categoryLabel[c]}
					</button>
				{/each}
			</div>
		</div>
		<div class="flex justify-end">
			<button type="button" onclick={anlegen} disabled={!titel.trim()} class="btn-primary">
				Hinzufügen
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
			<p class="px-1 text-sm text-zinc-500">Noch nichts auf deiner Liste.</p>
		{/if}
		{#each sichtbar as b (b.id)}
			<div class="card flex items-start gap-3 p-3.5 {b.done ? 'opacity-60' : ''}">
				<button
					type="button"
					onclick={() => toggleBucketDone(b.id, !b.done)}
					aria-label="Erledigt umschalten"
					class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors {b.done
						? 'border-teal-400 bg-teal-400 text-zinc-950'
						: 'border-zinc-600 text-transparent hover:border-zinc-400'}"
				>
					<Icon name="check" class="h-3 w-3" />
				</button>
				<div class="min-w-0 flex-1">
					<p class="text-sm {b.done ? 'text-zinc-500 line-through' : 'text-zinc-100'}">
						{b.title}
					</p>
					{#if b.description}
						<p class="mt-0.5 text-xs whitespace-pre-wrap text-zinc-400">{b.description}</p>
					{/if}
					<div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
						<span class="chip px-2 py-0.5 {categoryBadge[b.category]}"
							>{categoryLabel[b.category]}</span
						>
						{#if b.targetDate}
							<span class="flex items-center gap-1 text-zinc-500">
								<Icon name="flag" class="h-3.5 w-3.5" /> bis {fmtDatum(b.targetDate)}
							</span>
						{/if}
					</div>
				</div>
				<button
					type="button"
					onclick={() => deleteBucketItem(b.id)}
					aria-label="Löschen"
					class="shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
				>
					<Icon name="x" class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>
</section>
