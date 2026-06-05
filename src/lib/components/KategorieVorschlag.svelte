<script lang="ts">
	import { suggestCategory } from '$lib/classify';
	import { setCategory } from '$lib/db/notes';
	import type { Category, Note } from '$lib/db/types';

	let { note }: { note: Note } = $props();

	const catLabel: Record<Category, string> = {
		privat: 'Privat',
		geschaeftlich: 'Geschäftlich',
		offen: 'Offen'
	};

	// Vorschlag nur für "offene" Notizen — sonst gibt es nichts zu raten.
	const vorschlag = $derived(note.category === 'offen' ? suggestCategory(note.content) : null);
</script>

{#if vorschlag}
	<div class="mt-1.5 flex items-center gap-2 text-xs">
		<span class="text-stone-400">
			KI-Vorschlag: <span class="font-medium text-stone-600">{catLabel[vorschlag]}</span>?
		</span>
		<button
			type="button"
			onclick={() => vorschlag && setCategory(note.id, vorschlag)}
			class="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700 hover:bg-teal-100"
		>
			Übernehmen
		</button>
	</div>
{/if}
