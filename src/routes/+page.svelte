<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addNote, softDeleteNote, notesForDay } from '$lib/db/notes';
	import { recentSleep, sleepDuration } from '$lib/db/sleep';
	import { upcomingAppointments } from '$lib/db/appointments';
	import { relativeDayLabel } from '$lib/format';
	import type { Appointment, Category, Note, SleepEntry } from '$lib/db/types';
	import KategorieVorschlag from '$lib/components/KategorieVorschlag.svelte';

	const heute = new Date();
	const datum = heute.toLocaleDateString('de-DE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
	const stunde = heute.getHours();
	const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Guten Tag' : 'Guten Abend';

	// Live-Daten fürs Briefing
	let notizen = $state<Note[]>([]);
	let schlaf = $state<SleepEntry[]>([]);
	let termine = $state<Appointment[]>([]);
	$effect(() => {
		const s = liveQuery(() => notesForDay(new Date())).subscribe((v) => (notizen = v));
		return () => s.unsubscribe();
	});
	$effect(() => {
		const s = liveQuery(() => recentSleep(1)).subscribe((v) => (schlaf = v));
		return () => s.unsubscribe();
	});
	$effect(() => {
		const s = liveQuery(() => upcomingAppointments()).subscribe((v) => (termine = v));
		return () => s.unsubscribe();
	});
	const letzteNacht = $derived(schlaf[0]);
	const naechste = $derived(termine.slice(0, 3));

	// Schnellnotiz
	let text = $state('');
	let category = $state<Category>('offen');
	const kategorien: { wert: Category; label: string }[] = [
		{ wert: 'privat', label: 'Privat' },
		{ wert: 'geschaeftlich', label: 'Geschäftlich' },
		{ wert: 'offen', label: 'Offen' }
	];
	const catLabel: Record<Category, string> = {
		privat: 'Privat',
		geschaeftlich: 'Geschäftlich',
		offen: 'Offen'
	};

	async function speichern() {
		const inhalt = text.trim();
		if (!inhalt) return;
		await addNote({ content: inhalt, category });
		text = '';
	}

	function uhrzeit(ms: number): string {
		return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}
	function schlafDauer(e: SleepEntry): string {
		const m = sleepDuration(e.bedTime, e.wakeTime);
		return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
	}
</script>

<section class="space-y-5">
	<div>
		<p class="text-sm text-stone-500">{datum}</p>
		<h2 class="text-2xl font-semibold">{gruss}.</h2>
	</div>

	<!-- Briefing: letzte Nacht + nächster Termin -->
	<div class="grid grid-cols-2 gap-2">
		<div class="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
			<p class="text-xs font-medium text-stone-500">🌙 Letzte Nacht</p>
			{#if letzteNacht}
				<p class="mt-1 text-sm font-semibold text-stone-800">{schlafDauer(letzteNacht)}</p>
				<p class="text-xs text-amber-400">{'★'.repeat(letzteNacht.quality)}</p>
			{:else}
				<p class="mt-1 text-xs text-stone-400">Noch kein Eintrag — im Tab „Schlaf“.</p>
			{/if}
		</div>
		<div class="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
			<p class="text-xs font-medium text-stone-500">📅 Als Nächstes</p>
			{#if naechste.length > 0}
				<p class="mt-1 truncate text-sm font-semibold text-stone-800">{naechste[0].title}</p>
				<p class="text-xs text-stone-400">{relativeDayLabel(naechste[0].startAt)}</p>
			{:else}
				<p class="mt-1 text-xs text-stone-400">Keine Termine.</p>
			{/if}
		</div>
	</div>

	{#if naechste.length > 1}
		<div class="space-y-1">
			{#each naechste.slice(1) as t (t.id)}
				<div
					class="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-stone-100"
				>
					<span class="truncate text-stone-700">{t.title}</span>
					<span class="shrink-0 pl-2 text-xs text-stone-400">{relativeDayLabel(t.startAt)}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Schnellnotiz für heute -->
	<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<h3 class="text-sm font-medium text-stone-700">Schnellnotiz für heute</h3>
		<textarea
			bind:value={text}
			rows="2"
			placeholder="Was möchtest du festhalten?"
			class="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm
				outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		></textarea>
		<div class="mt-2 flex items-center justify-between gap-2">
			<div class="flex gap-1">
				{#each kategorien as k}
					<button
						type="button"
						onclick={() => (category = k.wert)}
						class="rounded-full px-2.5 py-1 text-xs transition-colors {category === k.wert
							? 'bg-teal-600 text-white'
							: 'bg-stone-100 text-stone-500 hover:bg-stone-200'}"
					>
						{k.label}
					</button>
				{/each}
			</div>
			<button
				type="button"
				onclick={speichern}
				disabled={!text.trim()}
				class="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-30"
			>
				Speichern
			</button>
		</div>
	</div>

	<!-- Heute notiert -->
	<div class="space-y-2">
		<h3 class="px-1 text-sm font-medium text-stone-700">Heute notiert</h3>
		{#if notizen.length > 0}
			{#each notizen as n (n.id)}
				<div class="rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
					<div class="flex items-start justify-between gap-3">
						<p class="whitespace-pre-wrap text-sm text-stone-800">{n.content}</p>
						<button
							type="button"
							onclick={() => softDeleteNote(n.id)}
							aria-label="Notiz löschen"
							class="shrink-0 text-stone-300 hover:text-rose-500"
						>
							✕
						</button>
					</div>
					<div class="mt-1 flex items-center gap-2 text-xs text-stone-400">
						<span>{uhrzeit(n.createdAt)}</span>
						<span aria-hidden="true">·</span>
						<span>{catLabel[n.category]}</span>
					</div>
					<KategorieVorschlag note={n} />
				</div>
			{/each}
		{:else}
			<p class="px-1 text-sm text-stone-400">Noch keine Notiz heute.</p>
		{/if}
	</div>
</section>
