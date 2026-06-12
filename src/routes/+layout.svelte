<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { persistStorage, probeIndexedDB } from '$lib/db/health';
	import { sphaere } from '$lib/sphere-state.svelte';
	import type { Sphere } from '$lib/sphere';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/components/Icon.svelte';

	let { children } = $props();

	// Beim Start (nur Client): persistenten Speicher anfordern und prüfen, ob
	// IndexedDB nutzbar ist. Ist es blockiert (z. B. privater Browser-Modus),
	// warnen wir, statt Daten still ins Leere zu schreiben.
	let dbBlockiert = $state(false);
	$effect(() => {
		persistStorage();
		probeIndexedDB().then((ok) => (dbBlockiert = !ok));
	});

	const nav: { href: string; label: string; icon: IconName }[] = [
		{ href: '/', label: 'Heute', icon: 'sun' },
		{ href: '/notizen', label: 'Notizen', icon: 'note' },
		{ href: '/projekte', label: 'Projekte', icon: 'folder' },
		{ href: '/termine', label: 'Termine', icon: 'calendar' },
		{ href: '/bucketlist', label: 'Bucket', icon: 'sparkles' },
		{ href: '/schlaf', label: 'Schlaf', icon: 'moon' }
	];

	// Sphären-Umschalter: verbindet Privat- und Arbeitsleben in einer App.
	// Die Wahl filtert alle Inhalte (Notizen, Termine, Bucketlist, Briefing).
	const sphären: { wert: Sphere; label: string; icon: IconName; active: string }[] = [
		{ wert: 'privat', label: 'Privat', icon: 'heart', active: 'bg-amber-400/90 text-zinc-950' },
		{ wert: 'alles', label: 'Alles', icon: 'layers', active: 'bg-zinc-200 text-zinc-900' },
		{
			wert: 'geschaeftlich',
			label: 'Arbeit',
			icon: 'briefcase',
			active: 'bg-sky-400/90 text-zinc-950'
		}
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="relative flex min-h-dvh flex-col overflow-x-clip bg-zinc-950 text-zinc-100 antialiased">
	<!-- Hintergrund: die beiden Sphären als weiche Farbflächen — Amber (privat)
	     oben links, Himmelblau (Arbeit) unten rechts — verschmelzen in der Mitte. -->
	<div class="pointer-events-none fixed inset-0" aria-hidden="true">
		<div
			class="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl
				{sphaere.current === 'geschaeftlich' ? 'opacity-30' : 'opacity-100'} transition-opacity duration-700"
		></div>
		<div
			class="absolute -right-24 -bottom-32 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl
				{sphaere.current === 'privat' ? 'opacity-30' : 'opacity-100'} transition-opacity duration-700"
		></div>
		<div class="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-500/[0.07] blur-3xl"></div>
	</div>

	<header class="relative z-10 mx-auto w-full max-w-md px-5 pt-6 pb-2">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-2.5">
				<span
					class="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-rose-400 to-sky-500 text-zinc-950 shadow-lg shadow-rose-500/20"
				>
					<Icon name="sun" class="h-4.5 w-4.5" />
				</span>
				<div class="leading-tight">
					<p class="text-sm font-semibold tracking-tight">Alltags-Helfer</p>
					<p class="text-[11px] text-zinc-500">Privat &amp; Arbeit, ein Ort</p>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<!-- Sphären-Umschalter -->
				<div
					class="flex rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl"
					role="group"
					aria-label="Sphäre wählen"
				>
					{#each sphären as s (s.wert)}
						{@const aktiv = sphaere.current === s.wert}
						<button
							type="button"
							onclick={() => sphaere.set(s.wert)}
							aria-pressed={aktiv}
							title={s.label}
							class="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-300
								{aktiv ? s.active : 'text-zinc-500 hover:text-zinc-300'}"
						>
							<Icon name={s.icon} class="h-3.5 w-3.5" />
							{#if aktiv}<span>{s.label}</span>{/if}
						</button>
					{/each}
				</div>

				<a
					href="/einstellungen"
					aria-label="Einstellungen"
					class="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl transition-colors
						{page.url.pathname === '/einstellungen' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}"
				>
					<Icon name="gear" class="h-4 w-4" />
				</a>
			</div>
		</div>
	</header>

	{#if dbBlockiert}
		<div role="alert" class="relative z-10 mx-auto w-full max-w-md px-5 pt-2">
			<p
				class="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200"
			>
				Speichern ist derzeit nicht möglich – vermutlich privater Browser-Modus. Eingaben gehen
				verloren, sobald du die Seite schließt.
			</p>
		</div>
	{/if}

	<main class="relative z-10 mx-auto w-full max-w-md flex-1 px-5 pt-4 pb-32">
		{@render children()}
	</main>

	<!-- Schwebende Glas-Navigation -->
	<nav
		class="fixed inset-x-0 z-20"
		style="bottom: max(0.75rem, env(safe-area-inset-bottom))"
	>
		<ul
			class="mx-auto flex w-[calc(100%-2.5rem)] max-w-md items-stretch justify-between rounded-2xl border border-white/10 bg-zinc-900/85 px-2 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
		>
			{#each nav as item (item.href)}
				{@const active = page.url.pathname === item.href}
				<li class="flex-1">
					<a
						href={item.href}
						class="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors
							{active ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'}"
						aria-current={active ? 'page' : undefined}
					>
						<Icon name={item.icon} class="h-5 w-5" />
						<span>{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
