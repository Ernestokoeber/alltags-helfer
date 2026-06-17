<script lang="ts">
	// Codeblock mit „Kopieren". Inhalt wird als Text gerendert (Svelte escaped →
	// kein {@html}, daher sicher) in einem <pre> mit Monospace + horizontalem Scroll.
	let { content, lang = '' }: { content: string; lang?: string } = $props();

	let kopiert = $state(false);
	async function kopieren() {
		try {
			await navigator.clipboard.writeText(content);
			kopiert = true;
			setTimeout(() => (kopiert = false), 1500);
		} catch {
			// Clipboard nicht verfügbar (z. B. unsicherer Kontext) → still ignorieren.
		}
	}
</script>

<div class="group relative">
	<div class="absolute top-2 right-2 flex items-center gap-2">
		{#if lang}<span class="text-[10px] tracking-wide text-zinc-500 uppercase">{lang}</span>{/if}
		<button
			type="button"
			onclick={kopieren}
			class="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10"
		>
			{kopiert ? 'Kopiert' : 'Kopieren'}
		</button>
	</div>
	<pre
		class="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-zinc-200"><code
			>{content}</code
		></pre>
</div>
