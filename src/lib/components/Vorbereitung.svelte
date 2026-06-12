<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addPrepTask, prepTasksFor, togglePrepDone, deletePrepTask } from '$lib/db/prep';
	import type { PrepTask } from '$lib/db/types';
	import Icon from '$lib/components/Icon.svelte';

	let { appointmentId }: { appointmentId: string } = $props();

	// Live-Liste der Vorbereitungs-Aufgaben dieses Termins.
	let tasks = $state<PrepTask[]>([]);
	$effect(() => {
		const s = liveQuery(() => prepTasksFor(appointmentId)).subscribe((v) => (tasks = v));
		return () => s.unsubscribe();
	});

	let neu = $state('');
	async function hinzufuegen() {
		if (neu.trim()) {
			await addPrepTask(appointmentId, neu);
			neu = '';
		}
	}
</script>

<div class="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
	{#each tasks as t (t.id)}
		<div class="flex items-center gap-2 text-sm">
			<button
				type="button"
				onclick={() => togglePrepDone(t.id, !t.done)}
				aria-label="Erledigt umschalten"
				class="grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors {t.done
					? 'border-teal-400 bg-teal-400 text-zinc-950'
					: 'border-zinc-600 text-transparent hover:border-zinc-400'}"
			>
				<Icon name="check" class="h-2.5 w-2.5" />
			</button>
			<span class="flex-1 {t.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}">{t.title}</span>
			<button
				type="button"
				onclick={() => deletePrepTask(t.id)}
				aria-label="Vorbereitung löschen"
				class="text-zinc-600 transition-colors hover:text-rose-400"
			>
				<Icon name="x" class="h-3.5 w-3.5" />
			</button>
		</div>
	{/each}
	<input
		bind:value={neu}
		placeholder="Vorbereitung hinzufügen"
		onkeydown={(e) => {
			if (e.key === 'Enter') hinzufuegen();
		}}
		class="w-full rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-teal-300/50"
	/>
</div>
