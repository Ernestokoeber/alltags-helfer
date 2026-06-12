<script lang="ts">
	import { suggestCategory } from '$lib/classify';
	import { setCategory } from '$lib/db/notes';
	import type { Note } from '$lib/db/types';
	import { categoryLabel } from '$lib/sphere';
	import Icon from '$lib/components/Icon.svelte';

	let { note }: { note: Note } = $props();

	// Vorschlag nur für "offene" Notizen — sonst gibt es nichts zu raten.
	const vorschlag = $derived(note.category === 'offen' ? suggestCategory(note.content) : null);
</script>

{#if vorschlag}
	<div class="mt-2 flex items-center gap-2 text-xs">
		<span class="flex items-center gap-1.5 text-zinc-500">
			<Icon name="sparkles" class="h-3.5 w-3.5 text-teal-300" />
			Vorschlag: <span class="font-medium text-zinc-300">{categoryLabel[vorschlag]}</span>?
		</span>
		<button
			type="button"
			onclick={() => vorschlag && setCategory(note.id, vorschlag)}
			class="rounded-full bg-teal-400/15 px-2 py-0.5 font-medium text-teal-300 ring-1 ring-teal-400/25 ring-inset transition-colors hover:bg-teal-400/25"
		>
			Übernehmen
		</button>
	</div>
{/if}
