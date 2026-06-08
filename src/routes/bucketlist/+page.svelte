<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addBucketItem, allBucketItems, toggleBucketDone, deleteBucketItem } from '$lib/db/bucket';
	import type { BucketItem, Category } from '$lib/db/types';

	let liste = $state<BucketItem[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allBucketItems()).subscribe((v) => (liste = v));
		return () => sub.unsubscribe();
	});

	// Erledigte ein-/ausblenden (Standard: anzeigen, ans Ende sortiert).
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
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-semibold">Bucketlist</h2>

	<div class="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<input
			bind:value={titel}
			placeholder="Was möchtest du erleben?"
			onkeydown={(e) => {
				if (e.key === 'Enter') anlegen();
			}}
			class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		/>
		<textarea
			bind:value={beschreibung}
			rows="2"
			placeholder="Beschreibung (optional)"
			class="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		></textarea>
		<div class="flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1 text-xs text-stone-500">
				Zieldatum (optional)
				<input
					bind:value={zieldatum}
					type="date"
					class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
				/>
			</label>
			<div class="flex flex-col gap-1 text-xs text-stone-500">
				<span>Kategorie</span>
				<div class="flex gap-1.5" role="group" aria-label="Kategorie wählen">
					{#each ['offen', 'privat', 'geschaeftlich'] as const as c (c)}
						<button
							type="button"
							onclick={() => (kategorie = c)}
							aria-pressed={kategorie === c}
							class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
								{kategorie === c
								? 'bg-stone-900 text-white'
								: 'bg-white text-stone-500 ring-1 ring-stone-200 hover:text-stone-800'}"
						>
							{catLabel[c]}
						</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="flex justify-end">
			<button
				type="button"
				onclick={anlegen}
				disabled={!titel.trim()}
				class="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-30"
			>
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
				class="text-xs font-medium text-stone-500 hover:text-stone-800"
			>
				{zeigeErledigte ? `Erledigte ausblenden (${erledigteAnzahl})` : 'Erledigte anzeigen'}
			</button>
		</div>
	{/if}

	<div class="space-y-2">
		{#if sichtbar.length === 0}
			<p class="px-1 text-sm text-stone-400">Noch nichts auf deiner Liste.</p>
		{/if}
		{#each sichtbar as b (b.id)}
			<div class="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
				<button
					type="button"
					onclick={() => toggleBucketDone(b.id, !b.done)}
					aria-label="Erledigt umschalten"
					class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs {b.done
						? 'border-teal-500 bg-teal-500 text-white'
						: 'border-stone-300 text-transparent'}"
				>
					✓
				</button>
				<div class="min-w-0 flex-1">
					<p class="text-sm {b.done ? 'text-stone-400 line-through' : 'text-stone-800'}">
						{b.title}
					</p>
					{#if b.description}
						<p class="mt-0.5 whitespace-pre-wrap text-xs text-stone-500">{b.description}</p>
					{/if}
					<div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
						<span class="rounded-full px-2 py-0.5 {catStyle[b.category]}">{catLabel[b.category]}</span>
						{#if b.targetDate}
							<span class="text-stone-400">🎯 bis {fmtDatum(b.targetDate)}</span>
						{/if}
					</div>
				</div>
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
