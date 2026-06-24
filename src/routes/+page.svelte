<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addNote, softDeleteNote, notesForDay, openTasks, erledige } from '$lib/db/notes';
	import { upcomingAppointments } from '$lib/db/appointments';
	import { relativeDayLabel, tagesgruss } from '$lib/format';
	import { tagestipp } from '$lib/tips';
	import { faelligeErinnerungen } from '$lib/reminders';
	import type { Appointment, Category, Note } from '$lib/db/types';
	import { categoryLabel, categoryBadge, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import KategorieVorschlag from '$lib/components/KategorieVorschlag.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PanelAufgaben from '$lib/components/PanelAufgaben.svelte';
	import PanelTermine from '$lib/components/PanelTermine.svelte';
	import PanelNotizen from '$lib/components/PanelNotizen.svelte';
	import Wetter from '$lib/components/Wetter.svelte';

	// Aktuelle Zeit, regelmäßig aktualisiert → Begrüßung und Uhr bleiben aktuell,
	// auch wenn die App über eine Band-/Tagesgrenze hinaus offen bleibt.
	let now = $state(new Date());
	$effect(() => {
		const id = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(id);
	});
	const datum = $derived(
		now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
	);
	const gruss = $derived(tagesgruss(now));
	const uhr = $derived(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));

	// Live-Daten fürs Briefing
	let notizenAlle = $state<Note[]>([]);
	let termineAlle = $state<Appointment[]>([]);
	let aufgabenAlle = $state<Note[]>([]);
	$effect(() => {
		const s = liveQuery(() => notesForDay(new Date())).subscribe((v) => (notizenAlle = v));
		return () => s.unsubscribe();
	});
	$effect(() => {
		const s = liveQuery(() => upcomingAppointments()).subscribe((v) => (termineAlle = v));
		return () => s.unsubscribe();
	});
	$effect(() => {
		const s = liveQuery(() => openTasks()).subscribe((v) => (aufgabenAlle = v));
		return () => s.unsubscribe();
	});

	// Sphären-Sicht: Briefing und Tagesnotizen folgen dem globalen Umschalter.
	const notizen = $derived(filterBySphere(notizenAlle, sphaere.current));
	const termine = $derived(filterBySphere(termineAlle, sphaere.current));
	const naechste = $derived(termine.slice(0, 3));

	// In-App-Erinnerungen: überfällige/bald fällige Aufgaben + anstehende Termine
	// (sphärengefiltert). `now` tickt → bleibt aktuell.
	const erinnerungen = $derived(
		faelligeErinnerungen(
			filterBySphere(aufgabenAlle, sphaere.current),
			filterBySphere(termineAlle, sphaere.current),
			now.getTime()
		)
	);

	// In „Alles": je der nächste private und der nächste Arbeits-Termin —
	// die beiden Lebensbereiche nebeneinander auf einen Blick.
	const naechstePrivat = $derived(termineAlle.find((t) => t.category === 'privat'));
	const naechsteArbeit = $derived(termineAlle.find((t) => t.category === 'geschaeftlich'));

	// Sanfter Tagestipp (Entschleunigung): folgt der Sphäre (offene Aufgaben/Termine)
	// und der Tageszeit. Pro Tag ausblendbar — der Schlüssel ist das lokale Datum.
	const heuteKey = $derived(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
	);
	const tipp = $derived(
		tagestipp({
			now,
			offeneAufgaben: filterBySphere(aufgabenAlle, sphaere.current).length,
			anstehendeTermine: termine.length
		})
	);
	// Client-only aus localStorage: heute schon ausgeblendet? (reagiert auf Tageswechsel)
	let tippWeg = $state(false);
	$effect(() => {
		try {
			tippWeg = localStorage.getItem('tip.dismissed') === heuteKey;
		} catch {
			// localStorage evtl. blockiert → Tipp bleibt sichtbar.
		}
	});
	function tippAusblenden() {
		try {
			localStorage.setItem('tip.dismissed', heuteKey);
		} catch {
			// ignorieren — dann eben nur für diese Sitzung ausgeblendet.
		}
		tippWeg = true;
	}

	// Schnellnotiz: Kategorie folgt der aktiven Sphäre als sinnvoller Vorgabe.
	let text = $state('');
	let category = $state<Category>(sphaere.current === 'alles' ? 'offen' : sphaere.current);
	$effect(() => {
		category = sphaere.current === 'alles' ? 'offen' : sphaere.current;
	});
	const kategorien: Category[] = ['privat', 'geschaeftlich', 'offen'];

	async function speichern() {
		const inhalt = text.trim();
		if (!inhalt) return;
		await addNote({ content: inhalt, category });
		text = '';
	}

	function uhrzeit(ms: number): string {
		return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<section class="space-y-5">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<p class="text-sm text-zinc-500">{datum}</p>
			<h2
				class="bg-gradient-to-r from-amber-200 via-zinc-50 to-sky-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent"
			>
				{gruss}
			</h2>
		</div>
		<div class="shrink-0 text-right">
			<p class="text-2xl font-semibold tabular-nums text-zinc-200">{uhr}</p>
			<Wetter />
		</div>
	</div>

	<!-- Sanfter Tagestipp (Entschleunigung) — dezent, pro Tag ausblendbar -->
	{#if tipp && !tippWeg}
		<div
			class="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
		>
			<Icon name="sparkles" class="mt-0.5 h-4 w-4 shrink-0 text-teal-300/70" />
			<p class="min-w-0 flex-1 text-sm text-zinc-400">{tipp}</p>
			<button
				type="button"
				onclick={tippAusblenden}
				aria-label="Tipp für heute ausblenden"
				class="shrink-0 text-zinc-600 transition-colors hover:text-zinc-300"
			>
				<Icon name="x" class="h-3.5 w-3.5" />
			</button>
		</div>
	{/if}

	<!-- In-App-Erinnerungen: nur sichtbar, wenn etwas ansteht -->
	{#if erinnerungen.anzahl > 0}
		<div class="card border-amber-400/25 bg-amber-400/[0.06] p-4">
			<h3 class="flex items-center gap-2 text-sm font-semibold text-amber-200">
				<Icon name="flag" class="h-4 w-4" /> Erinnerungen ({erinnerungen.anzahl})
			</h3>
			<ul class="mt-2 space-y-1.5">
				{#each erinnerungen.items as e (e.art === 'aufgabe' ? `a-${e.note.id}` : `t-${e.appointment.id}`)}
					<li class="flex items-start gap-2 text-sm">
						{#if e.art === 'aufgabe'}
							<button
								type="button"
								onclick={() => erledige(e.note, true)}
								aria-label="Als erledigt markieren"
								class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border border-zinc-600 text-transparent transition-colors hover:border-emerald-400 hover:text-emerald-300"
							>
								<Icon name="check" class="h-3 w-3" />
							</button>
							<div class="min-w-0 flex-1">
								<p class="truncate text-zinc-100">{e.note.content}</p>
								<p class="text-xs {e.ueberfaellig ? 'font-medium text-rose-400' : 'text-zinc-500'}">
									fällig {relativeDayLabel(e.zeit)}{#if e.ueberfaellig} · überfällig{/if}
								</p>
							</div>
						{:else}
							<Icon name="calendar" class="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-zinc-100">{e.appointment.title}</p>
								<p class="text-xs text-zinc-500">{relativeDayLabel(e.zeit)}</p>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Ab lg: zweispaltig — Tagesbereich (2/3) + Überblick-Panels (1/3). -->
	<div class="lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
		<div class="space-y-5 lg:col-span-2">
			<!-- Briefing: nächster Termin der aktiven Sphäre -->
			<div class="card p-3.5">
				<p class="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
					<Icon name="calendar" class="h-3.5 w-3.5 text-teal-300" /> Als Nächstes
				</p>
				{#if naechste.length > 0}
					<p class="mt-1.5 truncate text-base font-semibold text-zinc-100">{naechste[0].title}</p>
					<p class="text-xs text-zinc-500">{relativeDayLabel(naechste[0].startAt)}</p>
				{:else}
					<p class="mt-1.5 text-xs text-zinc-500">Keine Termine.</p>
				{/if}
			</div>

			<!-- Die Brücke zwischen den Sphären: nur in „Alles" sichtbar -->
			{#if sphaere.current === 'alles' && (naechstePrivat || naechsteArbeit)}
				<div class="card overflow-hidden">
					<div class="grid grid-cols-2 divide-x divide-white/10">
						<div class="p-3.5">
							<p class="flex items-center gap-1.5 text-xs font-medium text-amber-300">
								<Icon name="heart" class="h-3.5 w-3.5" /> Privat
							</p>
							{#if naechstePrivat}
								<p class="mt-1 truncate text-sm font-semibold text-zinc-100">{naechstePrivat.title}</p>
								<p class="text-xs text-zinc-500">{relativeDayLabel(naechstePrivat.startAt)}</p>
							{:else}
								<p class="mt-1 text-xs text-zinc-500">Nichts geplant — gut so.</p>
							{/if}
						</div>
						<div class="p-3.5">
							<p class="flex items-center gap-1.5 text-xs font-medium text-sky-300">
								<Icon name="briefcase" class="h-3.5 w-3.5" /> Arbeit
							</p>
							{#if naechsteArbeit}
								<p class="mt-1 truncate text-sm font-semibold text-zinc-100">{naechsteArbeit.title}</p>
								<p class="text-xs text-zinc-500">{relativeDayLabel(naechsteArbeit.startAt)}</p>
							{:else}
								<p class="mt-1 text-xs text-zinc-500">Frei von Terminen.</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Weitere anstehende Termine — auf dem Desktop deckt das Panel rechts das ab. -->
			{#if naechste.length > 1}
				<div class="space-y-1.5 lg:hidden">
					{#each naechste.slice(1) as t (t.id)}
						<div class="card flex items-center justify-between px-3.5 py-2.5 text-sm">
							<span class="flex min-w-0 items-center gap-2">
								<span class="truncate text-zinc-200">{t.title}</span>
								<span class="chip shrink-0 px-2 py-0.5 {categoryBadge[t.category]}"
									>{categoryLabel[t.category]}</span
								>
							</span>
							<span class="shrink-0 pl-2 text-xs text-zinc-500">{relativeDayLabel(t.startAt)}</span>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Schnellnotiz für heute -->
			<div class="card p-4">
				<h3 class="flex items-center gap-2 text-sm font-medium text-zinc-300">
					<Icon name="note" class="h-4 w-4 text-zinc-500" /> Schnellnotiz für heute
				</h3>
				<textarea
					bind:value={text}
					rows="2"
					placeholder="Was möchtest du festhalten?"
					class="field mt-2.5 resize-none"
				></textarea>
				<p class="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-600">
					<Icon name="mic" class="h-3 w-3" /> Tipp: zum Diktieren das Tastatur-Mikrofon nutzen
				</p>
				<div class="mt-2.5 flex items-center justify-between gap-2">
					<div class="flex gap-1">
						{#each kategorien as k (k)}
							<button
								type="button"
								onclick={() => (category = k)}
								aria-pressed={category === k}
								class="chip px-2.5 {category === k ? categoryChipActive[k] : 'chip-idle'}"
							>
								{categoryLabel[k]}
							</button>
						{/each}
					</div>
					<button type="button" onclick={speichern} disabled={!text.trim()} class="btn-primary">
						Speichern
					</button>
				</div>
			</div>

			<!-- Heute notiert -->
			<div class="space-y-2">
				<h3 class="px-1 text-sm font-medium text-zinc-300">Heute notiert</h3>
				{#if notizen.length > 0}
					{#each notizen as n (n.id)}
						<div class="card p-3.5">
							<div class="flex items-start justify-between gap-3">
								<p class="text-sm whitespace-pre-wrap text-zinc-100">{n.content}</p>
								<button
									type="button"
									onclick={() => softDeleteNote(n.id)}
									aria-label="Notiz löschen"
									class="shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
								>
									<Icon name="x" class="h-4 w-4" />
								</button>
							</div>
							<div class="mt-2 flex items-center gap-2 text-xs text-zinc-500">
								<span>{uhrzeit(n.createdAt)}</span>
								<span class="chip px-2 py-0.5 {categoryBadge[n.category]}"
									>{categoryLabel[n.category]}</span
								>
							</div>
							<KategorieVorschlag note={n} />
						</div>
					{/each}
				{:else}
					<p class="px-1 text-sm text-zinc-500">Noch keine Notiz heute.</p>
				{/if}
			</div>
		</div>

		<!-- Überblick-Panels: nur auf dem Desktop, füllen die rechte Spalte. -->
		<aside class="hidden lg:col-span-1 lg:flex lg:flex-col lg:gap-4">
			<PanelAufgaben limit={6} />
			<PanelTermine limit={6} />
			<PanelNotizen limit={5} />
		</aside>
	</div>
</section>
