<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addPrepTask, prepTasksFor, togglePrepDone, deletePrepTask } from '$lib/db/prep';
	import type { PrepTask } from '$lib/db/types';

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

<div class="mt-2 space-y-1 border-t border-stone-100 pt-2">
	{#each tasks as t (t.id)}
		<div class="flex items-center gap-2 text-sm">
			<button
				type="button"
				onclick={() => togglePrepDone(t.id, !t.done)}
				aria-label="Erledigt umschalten"
				class="grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] {t.done
					? 'border-teal-500 bg-teal-500 text-white'
					: 'border-stone-300 text-transparent'}"
			>
				✓
			</button>
			<span class="flex-1 {t.done ? 'text-stone-400 line-through' : 'text-stone-700'}">{t.title}</span>
			<button
				type="button"
				onclick={() => deletePrepTask(t.id)}
				aria-label="Vorbereitung löschen"
				class="text-stone-300 hover:text-rose-500">✕</button
			>
		</div>
	{/each}
	<input
		bind:value={neu}
		placeholder="Vorbereitung hinzufügen"
		onkeydown={(e) => {
			if (e.key === 'Enter') hinzufuegen();
		}}
		class="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs outline-none focus:border-teal-400"
	/>
</div>
