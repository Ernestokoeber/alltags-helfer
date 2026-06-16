<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ProjectOption } from '$lib/db/projects';

	// Themenkonforme Projekt-Auswahl: Ordner-Icon links, eigener Chevron rechts
	// (appearance-none statt des kaum sichtbaren nativen Pfeils), volle Breite,
	// heller Text auf Glas. Nur Blatt-Projekte werden als Optionen erwartet.
	let {
		value = $bindable(''),
		options,
		label,
		placeholder = 'Kein Projekt'
	}: {
		value?: string;
		options: ProjectOption[];
		label: string;
		placeholder?: string;
	} = $props();
</script>

<div class="relative">
	<Icon
		name="folder"
		class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
	/>
	<select bind:value aria-label={label} class="field cursor-pointer appearance-none pr-9 pl-9">
		<option value="">{placeholder}</option>
		{#each options as o (o.id)}
			<option value={o.id}>{o.label}</option>
		{/each}
	</select>
	<Icon
		name="chevronDown"
		class="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
	/>
</div>
