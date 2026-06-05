<script lang="ts">
	import { liveQuery } from 'dexie';
	import { addAppointment, upcomingAppointments, deleteAppointment } from '$lib/db/appointments';
	import Vorbereitung from '$lib/components/Vorbereitung.svelte';
	import type { Appointment } from '$lib/db/types';

	let liste = $state<Appointment[]>([]);
	$effect(() => {
		const sub = liveQuery(() => upcomingAppointments()).subscribe((v) => (liste = v));
		return () => sub.unsubscribe();
	});

	let titel = $state('');
	let wann = $state('');
	let ort = $state('');

	async function anlegen() {
		const t = titel.trim();
		const ms = wann ? new Date(wann).getTime() : NaN;
		if (!t || Number.isNaN(ms)) return;
		await addAppointment({ title: t, startAt: ms, location: ort });
		titel = '';
		wann = '';
		ort = '';
	}

	function fmt(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<section class="space-y-4">
	<h2 class="text-2xl font-semibold">Termine</h2>

	<div class="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<input
			bind:value={titel}
			placeholder="Titel"
			class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		/>
		<input
			bind:value={wann}
			type="datetime-local"
			class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		/>
		<input
			bind:value={ort}
			placeholder="Ort (optional)"
			class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
		/>
		<div class="flex justify-end">
			<button
				type="button"
				onclick={anlegen}
				disabled={!titel.trim() || !wann}
				class="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-30"
			>
				Termin anlegen
			</button>
		</div>
	</div>

	<div class="space-y-2">
		<h3 class="px-1 text-sm font-medium text-stone-700">Anstehend</h3>
		{#if liste.length === 0}
			<p class="px-1 text-sm text-stone-400">Keine anstehenden Termine.</p>
		{/if}
		{#each liste as t (t.id)}
			<div class="rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm font-medium text-stone-800">{t.title}</p>
						<p class="mt-0.5 text-xs text-stone-400">
							{fmt(t.startAt)}{t.location ? ` · ${t.location}` : ''}
						</p>
					</div>
					<button
						type="button"
						onclick={() => deleteAppointment(t.id)}
						aria-label="Löschen"
						class="shrink-0 text-stone-300 hover:text-rose-500">✕</button
					>
				</div>
				<Vorbereitung appointmentId={t.id} />
			</div>
		{/each}
	</div>
</section>
