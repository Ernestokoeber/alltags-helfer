<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { persistStorage, probeIndexedDB } from '$lib/db/health';

	let { children } = $props();

	// Beim Start (nur Client): persistenten Speicher anfordern und prüfen, ob
	// IndexedDB nutzbar ist. Ist es blockiert (z. B. privater Browser-Modus),
	// warnen wir, statt Daten still ins Leere zu schreiben.
	let dbBlockiert = $state(false);
	$effect(() => {
		persistStorage();
		probeIndexedDB().then((ok) => (dbBlockiert = !ok));
	});

	// Geplante Bereiche der App. In P0 ist nur "Heute" mit Inhalt,
	// die übrigen Tabs sind Platzhalter und werden phasenweise gefüllt.
	const nav = [
		{ href: '/', label: 'Heute', icon: '☀️' },
		{ href: '/notizen', label: 'Notizen', icon: '📝' },
		{ href: '/termine', label: 'Termine', icon: '📅' },
		{ href: '/bucketlist', label: 'Bucket', icon: '✨' },
		{ href: '/schlaf', label: 'Schlaf', icon: '🌙' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-dvh flex-col bg-stone-50 text-stone-800">
	<header class="px-5 pt-6 pb-3">
		<h1 class="text-xl font-semibold tracking-tight">Alltags-Helfer</h1>
	</header>

	{#if dbBlockiert}
		<div
			role="alert"
			class="mx-auto w-full max-w-md px-5"
		>
			<p class="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
				Speichern ist derzeit nicht möglich – vermutlich privater Browser-Modus. Eingaben gehen
				verloren, sobald du die Seite schließt.
			</p>
		</div>
	{/if}

	<main class="mx-auto w-full max-w-md flex-1 px-5 pb-24">
		{@render children()}
	</main>

	<nav class="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white/85 backdrop-blur">
		<ul class="mx-auto flex max-w-md items-stretch justify-between px-2">
			{#each nav as item}
				{@const active = page.url.pathname === item.href}
				<li class="flex-1">
					<a
						href={item.href}
						class="flex flex-col items-center gap-0.5 py-2 text-xs transition-colors {active
							? 'text-teal-700'
							: 'text-stone-500 hover:text-stone-900'}"
						aria-current={active ? 'page' : undefined}
					>
						<span class="text-lg" aria-hidden="true">{item.icon}</span>
						<span>{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
