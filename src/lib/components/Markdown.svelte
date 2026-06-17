<script lang="ts">
	// Rendert die Blöcke von parseMarkdown. Codeblöcke über CodeBlock (sicher, mit
	// Kopieren); Inline-HTML der anderen Blöcke stammt aus markdown.ts (escaped +
	// nur eigene Tags) → {@html} ist hier vertretbar.
	import { parseMarkdown } from '$lib/markdown';
	import CodeBlock from './CodeBlock.svelte';

	let { source }: { source: string } = $props();
	const blocks = $derived(parseMarkdown(source));
</script>

<div class="space-y-2 text-sm text-zinc-100">
	{#each blocks as b, i (i)}
		{#if b.type === 'code'}
			<CodeBlock content={b.content} lang={b.lang} />
		{:else if b.type === 'heading'}
			{#if b.level === 1}
				<h1 class="text-lg font-bold text-zinc-100">{@html b.html}</h1>
			{:else if b.level === 2}
				<h2 class="text-base font-bold text-zinc-100">{@html b.html}</h2>
			{:else}
				<h3 class="text-sm font-semibold text-zinc-200">{@html b.html}</h3>
			{/if}
		{:else if b.type === 'ul'}
			<ul class="list-disc space-y-0.5 break-words pl-5">
				{#each b.items as it, j (j)}<li>{@html it}</li>{/each}
			</ul>
		{:else if b.type === 'ol'}
			<ol class="list-decimal space-y-0.5 break-words pl-5">
				{#each b.items as it, j (j)}<li>{@html it}</li>{/each}
			</ol>
		{:else if b.type === 'hr'}
			<hr class="border-white/10" />
		{:else}
			<p class="break-words">{@html b.html}</p>
		{/if}
	{/each}
</div>
