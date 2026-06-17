<script lang="ts">
	// Notiz-Inhalt mit Höhenbegrenzung: lange Notizen werden gekappt und per
	// „mehr anzeigen" aufgeklappt. Die Überlänge wird gemessen, damit kurze
	// Notizen keinen Button zeigen.
	let { content }: { content: string } = $props();
	let el = $state<HTMLParagraphElement | null>(null);
	let offen = $state(false);
	let langt = $state(false);

	$effect(() => {
		void content; // bei Inhaltsänderung neu prüfen
		if (el && !offen) langt = el.scrollHeight > el.clientHeight + 4;
	});
</script>

<div>
	<p
		bind:this={el}
		class="text-sm break-words whitespace-pre-wrap text-zinc-100 {offen
			? ''
			: 'max-h-64 overflow-hidden'}"
	>
		{content}
	</p>
	{#if langt}
		<button
			type="button"
			onclick={() => (offen = !offen)}
			class="mt-1 text-xs font-medium text-teal-300/80 transition-colors hover:text-teal-200"
		>
			{offen ? 'weniger' : 'mehr anzeigen'}
		</button>
	{/if}
</div>
