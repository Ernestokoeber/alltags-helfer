<script lang="ts">
	// Globales Such-Overlay (von jedem Tab aus). Notiz-Treffer öffnen direkt das
	// NotizModal; Projekt/Termin/Bucket springen zum jeweiligen Tab.
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { allNotes } from '$lib/db/notes';
	import { allProjects } from '$lib/db/projects';
	import { allAppointments } from '$lib/db/appointments';
	import { allBucketItems } from '$lib/db/bucket';
	import { sucheAlles } from '$lib/search';
	import { tagKey } from '$lib/calendar';
	import { categoryBadge, categoryLabel } from '$lib/sphere';
	import type { Note, Project, Appointment, BucketItem } from '$lib/db/types';
	import Icon from './Icon.svelte';
	import NotizModal from './NotizModal.svelte';

	let { onClose }: { onClose: () => void } = $props();

	let q = $state('');
	let notizen = $state<Note[]>([]);
	let projekte = $state<Project[]>([]);
	let termine = $state<Appointment[]>([]);
	let bucket = $state<BucketItem[]>([]);
	$effect(() => {
		const subs = [
			liveQuery(() => allNotes()).subscribe((v) => (notizen = v)),
			liveQuery(() => allProjects()).subscribe((v) => (projekte = v)),
			liveQuery(() => allAppointments()).subscribe((v) => (termine = v)),
			liveQuery(() => allBucketItems()).subscribe((v) => (bucket = v))
		];
		return () => subs.forEach((s) => s.unsubscribe());
	});

	const treffer = $derived(sucheAlles(q, { notizen, projekte, termine, bucket }));
	const projektName = $derived(new Map(projekte.map((p) => [p.id, p.name])));

	// Geöffnete Notiz live aus der Liste → spiegelt Änderungen, schließt bei Löschen.
	let offeneId = $state<string | null>(null);
	const offeneNotiz = $derived(offeneId ? (notizen.find((n) => n.id === offeneId) ?? null) : null);

	function gehe(pfad: string) {
		goto(`${base}${pfad}`);
		onClose();
	}
	function datum(ms: number): string {
		return new Date(ms).toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit'
		});
	}

	// Eingabe fokussieren + Hintergrund-Scroll sperren.
	let eingabe = $state<HTMLInputElement | null>(null);
	$effect(() => {
		eingabe?.focus();
		const vorher = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = vorher;
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div class="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-24">
	<button
		type="button"
		aria-label="Suche schließen"
		onclick={onClose}
		class="absolute inset-0 bg-black/60 backdrop-blur-sm"
	></button>

	<div
		role="dialog"
		aria-modal="true"
		aria-label="Suche"
		class="card relative z-10 flex max-h-[80vh] w-full flex-col sm:max-w-xl"
	>
		<div class="flex items-center gap-2 border-b border-white/10 px-4 py-3">
			<Icon name="search" class="h-4 w-4 shrink-0 text-zinc-500" />
			<input
				bind:this={eingabe}
				bind:value={q}
				type="search"
				placeholder="Suchen über Notizen, Projekte, Termine, Bucket …"
				class="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
			/>
			<button
				type="button"
				onclick={onClose}
				aria-label="Schließen"
				class="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200"
			>
				<Icon name="x" class="h-4 w-4" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto px-2 py-2">
			{#if q.trim() === ''}
				<p class="px-2 py-6 text-center text-sm text-zinc-500">Tippe, um zu suchen …</p>
			{:else if treffer.anzahl === 0}
				<p class="px-2 py-6 text-center text-sm text-zinc-500">Keine Treffer für „{q}".</p>
			{:else}
				{#if treffer.notizen.length}
					<p class="px-2 pt-2 pb-1 text-xs font-medium text-zinc-500">Notizen</p>
					{#each treffer.notizen as n (n.id)}
						<button
							type="button"
							onclick={() => (offeneId = n.id)}
							class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
						>
							<Icon name="note" class="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
							<span class="line-clamp-1 min-w-0 flex-1 text-sm text-zinc-100">{n.content}</span>
							<span class="chip shrink-0 px-1.5 py-0 text-[10px] {categoryBadge[n.category]}"
								>{categoryLabel[n.category]}</span
							>
						</button>
					{/each}
				{/if}

				{#if treffer.projekte.length}
					<p class="px-2 pt-2 pb-1 text-xs font-medium text-zinc-500">Projekte</p>
					{#each treffer.projekte as p (p.id)}
						<button
							type="button"
							onclick={() => gehe(`/projekte?p=${p.id}`)}
							class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
						>
							<Icon name="folder" class="h-4 w-4 shrink-0 text-zinc-500" />
							<span class="line-clamp-1 min-w-0 flex-1 text-sm text-zinc-100">{p.name}</span>
						</button>
					{/each}
				{/if}

				{#if treffer.termine.length}
					<p class="px-2 pt-2 pb-1 text-xs font-medium text-zinc-500">Termine</p>
					{#each treffer.termine as t (t.id)}
						<button
							type="button"
							onclick={() => gehe(`/termine?tag=${tagKey(t.startAt)}`)}
							class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
						>
							<Icon name="calendar" class="h-4 w-4 shrink-0 text-zinc-500" />
							<span class="line-clamp-1 min-w-0 flex-1 text-sm text-zinc-100">{t.title}</span>
							<span class="shrink-0 text-xs text-zinc-500">{datum(t.startAt)}</span>
						</button>
					{/each}
				{/if}

				{#if treffer.bucket.length}
					<p class="px-2 pt-2 pb-1 text-xs font-medium text-zinc-500">Bucketlist</p>
					{#each treffer.bucket as b (b.id)}
						<button
							type="button"
							onclick={() => gehe('/bucketlist')}
							class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
						>
							<Icon name="sparkles" class="h-4 w-4 shrink-0 text-zinc-500" />
							<span class="line-clamp-1 min-w-0 flex-1 text-sm text-zinc-100">{b.title}</span>
						</button>
					{/each}
				{/if}
			{/if}
		</div>
	</div>
</div>

{#if offeneNotiz}
	<NotizModal
		note={offeneNotiz}
		projektName={offeneNotiz.projectId ? projektName.get(offeneNotiz.projectId) : undefined}
		onClose={() => (offeneId = null)}
	/>
{/if}
