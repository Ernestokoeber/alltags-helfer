<script lang="ts">
	// Notiz im Overlay öffnen: voller, scrollbarer Inhalt + Bearbeiten im selben
	// Fenster, dazu Pin/Kategorie/Tags/Löschen. Die Notiz kommt live aus der Liste
	// (Eltern reicht sie aus der liveQuery durch).
	import {
		setPinned,
		setCategory,
		updateNoteDetails,
		addTag,
		removeTag,
		softDeleteNote
	} from '$lib/db/notes';
	import { categoryLabel, categoryBadge } from '$lib/sphere';
	import type { Category, Note, Recurrence } from '$lib/db/types';
	import Icon from './Icon.svelte';
	import Markdown from './Markdown.svelte';

	let { note, projektName, onClose }: { note: Note; projektName?: string; onClose: () => void } =
		$props();

	const naechste: Record<Category, Category> = {
		privat: 'geschaeftlich',
		geschaeftlich: 'offen',
		offen: 'privat'
	};

	let bearbeiten = $state(false);
	let text = $state(''); // Bearbeiten-Puffer, wird in starteBearbeiten gefüllt
	let frist = $state(''); // datetime-local
	let wiederholung = $state<Recurrence | 'none'>('none');
	let endeDatum = $state(''); // date
	let tagText = $state('');

	const wiederholungen: { wert: Recurrence | 'none'; label: string }[] = [
		{ wert: 'none', label: 'Einmalig' },
		{ wert: 'daily', label: 'Täglich' },
		{ wert: 'weekly', label: 'Wöchentlich' },
		{ wert: 'monthly', label: 'Monatlich' }
	];

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

	function starteBearbeiten() {
		text = note.content;
		frist = note.dueAt != null ? toLocalInput(note.dueAt) : '';
		wiederholung = note.recurrence ?? 'none';
		endeDatum = note.recurrenceUntil ? toDateInput(note.recurrenceUntil) : '';
		bearbeiten = true;
	}
	async function speichern() {
		if (!text.trim()) return;
		const dueAt = frist ? new Date(frist).getTime() : null;
		const until =
			wiederholung !== 'none' && endeDatum ? new Date(endeDatum + 'T23:59:59').getTime() : null;
		await updateNoteDetails(note.id, {
			content: text,
			dueAt,
			recurrence: wiederholung === 'none' ? undefined : wiederholung,
			recurrenceUntil: until
		});
		bearbeiten = false;
	}
	async function tagHinzufuegen() {
		if (tagText.trim()) await addTag(note.id, tagText);
		tagText = '';
	}
	async function loeschen() {
		await softDeleteNote(note.id);
		onClose();
	}

	function datumZeit(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Esc schließt (im Bearbeiten-Modus erst die Bearbeitung).
	function aufEsc(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (bearbeiten) bearbeiten = false;
		else onClose();
	}

	// Hintergrund-Scroll sperren, solange das Modal offen ist.
	$effect(() => {
		const vorher = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = vorher;
		};
	});
</script>

<svelte:window onkeydown={aufEsc} />

<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
	<!-- Backdrop als Button → schließt bei Klick, ohne A11y-Warnung -->
	<button
		type="button"
		aria-label="Overlay schließen"
		onclick={onClose}
		class="absolute inset-0 bg-black/60 backdrop-blur-sm"
	></button>

	<div
		role="dialog"
		aria-modal="true"
		aria-label="Notiz"
		class="card relative z-10 flex max-h-[90vh] w-full flex-col rounded-b-none sm:max-w-2xl sm:rounded-2xl"
	>
		<!-- Kopfzeile -->
		<div class="flex items-center gap-2 border-b border-white/10 px-4 py-3">
			<button
				type="button"
				onclick={() => setCategory(note.id, naechste[note.category])}
				class="chip px-2 py-0.5 {categoryBadge[note.category]}"
				title="Kategorie wechseln"
			>
				{categoryLabel[note.category]}
			</button>
			{#if projektName}
				<span
					class="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-400 ring-1 ring-white/10 ring-inset"
				>
					<Icon name="folder" class="h-3 w-3" />
					{projektName}
				</span>
			{/if}
			<span class="text-xs text-zinc-500">{datumZeit(note.createdAt)}</span>
			<div class="ml-auto flex items-center gap-2 text-zinc-500">
				<button
					type="button"
					onclick={() => setPinned(note.id, !note.pinned)}
					aria-label={note.pinned ? 'Pin entfernen' : 'Anpinnen'}
					class="transition-colors {note.pinned ? 'text-amber-300' : 'hover:text-zinc-300'}"
				>
					<Icon name="bookmark" class="h-4 w-4" filled={note.pinned} />
				</button>
				<button
					type="button"
					onclick={loeschen}
					aria-label="Löschen"
					class="transition-colors hover:text-rose-400"
				>
					<Icon name="trash" class="h-4 w-4" />
				</button>
				<button
					type="button"
					onclick={onClose}
					aria-label="Schließen"
					class="transition-colors hover:text-zinc-200"
				>
					<Icon name="x" class="h-5 w-5" />
				</button>
			</div>
		</div>

		<!-- Inhalt (scrollbar) -->
		<div class="flex-1 overflow-y-auto px-4 py-4">
			{#if bearbeiten}
				<textarea bind:value={text} rows="9" class="field resize-y"></textarea>
				<div class="mt-3 flex flex-col gap-3">
					<label class="flex flex-col gap-1 text-xs text-zinc-400">
						Frist (optional → macht die Notiz zur Aufgabe)
						<div class="flex items-center gap-2">
							<input bind:value={frist} type="datetime-local" class="field" />
							{#if frist}
								<button
									type="button"
									onclick={() => (frist = '')}
									class="shrink-0 text-xs text-zinc-500 hover:text-rose-400">entfernen</button
								>
							{/if}
						</div>
					</label>
					<div class="flex flex-col gap-1 text-xs text-zinc-400">
						<span>Wiederholung</span>
						<div class="flex flex-wrap gap-1" role="group" aria-label="Wiederholung wählen">
							{#each wiederholungen as w (w.wert)}
								<button
									type="button"
									onclick={() => (wiederholung = w.wert)}
									aria-pressed={wiederholung === w.wert}
									class="chip px-2.5 {wiederholung === w.wert
										? 'bg-zinc-100 text-zinc-900'
										: 'chip-idle'}">{w.label}</button
								>
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
				<div class="mt-3 flex justify-end gap-2">
					<button
						type="button"
						onclick={() => (bearbeiten = false)}
						class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">Abbrechen</button
					>
					<button type="button" onclick={speichern} class="btn-primary">Speichern</button>
				</div>
			{:else}
				{#if note.dueAt != null || note.recurrence}
					<div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
						{#if note.dueAt != null}
							<span class="flex items-center gap-1">
								<Icon name="flag" class="h-3.5 w-3.5" /> fällig {datumZeit(note.dueAt)}
							</span>
						{/if}
						{#if note.recurrence}
							<span class="flex items-center gap-1">
								<Icon name="repeat" class="h-3.5 w-3.5" />
								{note.recurrence === 'daily'
									? 'täglich'
									: note.recurrence === 'weekly'
										? 'wöchentlich'
										: 'monatlich'}
							</span>
						{/if}
					</div>
				{/if}
				<Markdown source={note.content} />
			{/if}
		</div>

		<!-- Fußzeile: Tags + Bearbeiten -->
		<div class="flex flex-wrap items-center gap-1 border-t border-white/10 px-4 py-3">
			{#each note.tags as t (t)}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-300 ring-1 ring-white/10 ring-inset"
				>
					#{t}
					<button
						type="button"
						onclick={() => removeTag(note.id, t)}
						aria-label="Tag entfernen"
						class="text-zinc-500 hover:text-rose-400">×</button
					>
				</span>
			{/each}
			<input
				bind:value={tagText}
				placeholder="+ Tag"
				onkeydown={(e) => {
					if (e.key === 'Enter') tagHinzufuegen();
				}}
				class="w-24 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-teal-300/50"
			/>
			{#if !bearbeiten}
				<button
					type="button"
					onclick={starteBearbeiten}
					class="ml-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
				>
					<Icon name="pencil" class="h-3.5 w-3.5" /> Bearbeiten
				</button>
			{/if}
		</div>
	</div>
</div>
