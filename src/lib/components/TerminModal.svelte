<script lang="ts">
	// Termin bearbeiten (ganze Serie) oder löschen. Bei Wiederholungen kann
	// wahlweise „nur dieses Vorkommen" (Ausnahme) oder die „ganze Serie" gelöscht
	// werden. `appointment` = Serien-Datensatz, `occurrenceMs` = geklicktes Vorkommen.
	import { untrack } from 'svelte';
	import { updateAppointment, deleteAppointment, addExDate } from '$lib/db/appointments';
	import { categoryLabel, categoryChipActive } from '$lib/sphere';
	import type { Appointment, Category, Recurrence } from '$lib/db/types';
	import Icon from './Icon.svelte';

	let {
		appointment,
		occurrenceMs,
		onClose
	}: { appointment: Appointment; occurrenceMs: number; onClose: () => void } = $props();

	function toLocalInput(ms: number): string {
		const d = new Date(ms);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
	}
	function toDateInput(ms: number): string {
		const d = new Date(ms);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
	}

	// Anfangswerte einmalig aus der Prop übernehmen (Editor; das Modal wird pro
	// Öffnen frisch gemountet, die Prop ändert sich währenddessen nicht).
	let titel = $state(untrack(() => appointment.title));
	let wann = $state(untrack(() => toLocalInput(appointment.startAt)));
	let ort = $state(untrack(() => appointment.location ?? ''));
	let kategorie = $state<Category>(untrack(() => appointment.category));
	let wiederholung = $state<Recurrence | 'none'>(untrack(() => appointment.recurrence ?? 'none'));
	let endeDatum = $state(
		untrack(() => (appointment.recurrenceUntil ? toDateInput(appointment.recurrenceUntil) : ''))
	);

	const kategorien: Category[] = ['privat', 'geschaeftlich', 'offen'];
	const wiederholungen: { wert: Recurrence | 'none'; label: string }[] = [
		{ wert: 'none', label: 'Einmalig' },
		{ wert: 'daily', label: 'Täglich' },
		{ wert: 'weekly', label: 'Wöchentlich' },
		{ wert: 'monthly', label: 'Monatlich' }
	];

	async function speichern() {
		const ms = wann ? new Date(wann).getTime() : NaN;
		if (!titel.trim() || Number.isNaN(ms)) return;
		const until =
			wiederholung !== 'none' && endeDatum ? new Date(endeDatum + 'T23:59:59').getTime() : null;
		await updateAppointment(appointment.id, {
			title: titel.trim(),
			startAt: ms,
			location: ort.trim() || undefined,
			category: kategorie,
			recurrence: wiederholung === 'none' ? undefined : wiederholung,
			recurrenceUntil: until
		});
		onClose();
	}

	async function serieLoeschen() {
		await deleteAppointment(appointment.id);
		onClose();
	}
	async function vorkommenLoeschen() {
		const d = new Date(occurrenceMs);
		const tagBeginn = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		await addExDate(appointment.id, tagBeginn);
		onClose();
	}

	$effect(() => {
		const vorher = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = vorher;
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
	<button
		type="button"
		aria-label="Overlay schließen"
		onclick={onClose}
		class="absolute inset-0 bg-black/60 backdrop-blur-sm"
	></button>

	<div
		role="dialog"
		aria-modal="true"
		aria-label="Termin bearbeiten"
		class="card relative z-10 flex max-h-[90vh] w-full flex-col rounded-b-none sm:max-w-md sm:rounded-2xl"
	>
		<div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
			<h3 class="text-sm font-semibold text-zinc-100">Termin bearbeiten</h3>
			<button
				type="button"
				onclick={onClose}
				aria-label="Schließen"
				class="text-zinc-500 transition-colors hover:text-zinc-200"
			>
				<Icon name="x" class="h-5 w-5" />
			</button>
		</div>

		<div class="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
			<input bind:value={titel} placeholder="Titel" class="field" />
			<label class="flex flex-col gap-1 text-xs text-zinc-400">
				Wann
				<input bind:value={wann} type="datetime-local" class="field" />
			</label>
			<input bind:value={ort} placeholder="Ort (optional)" class="field" />

			<div class="flex flex-col gap-1 text-xs text-zinc-400">
				<span>Kategorie</span>
				<div class="flex gap-1" role="group" aria-label="Kategorie wählen">
					{#each kategorien as k (k)}
						<button
							type="button"
							onclick={() => (kategorie = k)}
							aria-pressed={kategorie === k}
							class="chip px-2.5 {kategorie === k ? categoryChipActive[k] : 'chip-idle'}"
						>
							{categoryLabel[k]}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-1 text-xs text-zinc-400">
				<span>Wiederholung</span>
				<div class="flex flex-wrap gap-1" role="group" aria-label="Wiederholung wählen">
					{#each wiederholungen as w (w.wert)}
						<button
							type="button"
							onclick={() => (wiederholung = w.wert)}
							aria-pressed={wiederholung === w.wert}
							class="chip px-2.5 {wiederholung === w.wert ? 'bg-zinc-100 text-zinc-900' : 'chip-idle'}"
						>
							{w.label}
						</button>
					{/each}
				</div>
			</div>

			{#if wiederholung !== 'none'}
				<label class="flex flex-col gap-1 text-xs text-zinc-400">
					Wiederholen bis (optional)
					<input bind:value={endeDatum} type="date" class="field" />
				</label>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
			{#if appointment.recurrence}
				<button
					type="button"
					onclick={vorkommenLoeschen}
					class="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
					>Nur dieser Termin</button
				>
				<button
					type="button"
					onclick={serieLoeschen}
					class="rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10"
					>Ganze Serie</button
				>
			{:else}
				<button
					type="button"
					onclick={serieLoeschen}
					class="rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10"
					>Löschen</button
				>
			{/if}
			<button
				type="button"
				onclick={speichern}
				disabled={!titel.trim() || !wann}
				class="btn-primary ml-auto">Speichern</button
			>
		</div>
	</div>
</div>
