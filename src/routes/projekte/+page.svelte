<script lang="ts">
	import { liveQuery } from 'dexie';
	import {
		addProject,
		allProjects,
		setProjectArchived,
		deleteProject,
		notesForProject,
		noteCountByProject,
		childCountByProject
	} from '$lib/db/projects';
	import {
		addNote,
		softDeleteNote,
		setNoteCompleted,
		sortTasks,
		isOpen
	} from '$lib/db/notes';
	import {
		addAppointment,
		deleteAppointment,
		appointmentsForProject,
		appointmentCountByProject
	} from '$lib/db/appointments';
	import type { Category, Note, Project, Appointment } from '$lib/db/types';
	import { categoryLabel, categoryBadge, categoryChipActive, filterBySphere } from '$lib/sphere';
	import { sphaere } from '$lib/sphere-state.svelte';
	import Icon from '$lib/components/Icon.svelte';

	// --- Live-Datenquellen ---
	// Alle aktiven Projekte (für Baum, Breadcrumb, Ordner/Blatt-Entscheidung).
	let projekte = $state<Project[]>([]);
	$effect(() => {
		const sub = liveQuery(() => allProjects()).subscribe((v) => (projekte = v));
		return () => sub.unsubscribe();
	});

	// Zähler je Projekt für die Listenanzeige (Aufgaben/Termine/Unterprojekte).
	let notizAnzahl = $state<Map<string, number>>(new Map());
	let terminAnzahl = $state<Map<string, number>>(new Map());
	let kindAnzahl = $state<Map<string, number>>(new Map());
	$effect(() => {
		const s1 = liveQuery(() => noteCountByProject()).subscribe((v) => (notizAnzahl = v));
		const s2 = liveQuery(() => appointmentCountByProject()).subscribe((v) => (terminAnzahl = v));
		const s3 = liveQuery(() => childCountByProject()).subscribe((v) => (kindAnzahl = v));
		return () => {
			s1.unsubscribe();
			s2.unsubscribe();
			s3.unsubscribe();
		};
	});

	// Welches Projekt ist gerade geöffnet? null = oberste Ebene (Wurzelprojekte).
	let openId = $state<string | null>(null);
	const offen = $derived(openId ? (projekte.find((p) => p.id === openId) ?? null) : null);
	// Verschwindet das offene Projekt (gelöscht), zurück nach oben.
	$effect(() => {
		if (openId && !projekte.some((p) => p.id === openId)) openId = null;
	});

	// Breadcrumb-Pfad: Wurzel … aktuelles Projekt (mit Zyklus-Schutz).
	const pfad = $derived.by(() => {
		const out: Project[] = [];
		const byId = new Map(projekte.map((p) => [p.id, p]));
		const seen = new Set<string>();
		let cur = openId ? byId.get(openId) : undefined;
		while (cur && !seen.has(cur.id)) {
			seen.add(cur.id);
			out.unshift(cur);
			cur = cur.parentId ? byId.get(cur.parentId) : undefined;
		}
		return out;
	});

	// Direkte Unterprojekte der aktuellen Ebene, nach Sphäre gefiltert.
	const kinder = $derived(
		filterBySphere(
			projekte.filter((p) => (p.parentId ?? null) === openId),
			sphaere.current
		)
	);
	// Hat das offene Projekt aktive Unterprojekte? → Ordner statt Arbeitsbereich.
	const hatKinder = $derived(!!openId && (kindAnzahl.get(openId) ?? 0) > 0);

	// Inhalte (Aufgaben + Termine) des offenen Blatt-Projekts, live.
	let projektNotizen = $state<Note[]>([]);
	let projektTermine = $state<Appointment[]>([]);
	$effect(() => {
		if (!openId) {
			projektNotizen = [];
			projektTermine = [];
			return;
		}
		const id = openId;
		const sN = liveQuery(() => notesForProject(id)).subscribe((v) => (projektNotizen = v));
		const sT = liveQuery(() => appointmentsForProject(id)).subscribe((v) => (projektTermine = v));
		return () => {
			sN.unsubscribe();
			sT.unsubscribe();
		};
	});
	const aufgaben = $derived(sortTasks(projektNotizen));
	const hatInhalte = $derived(projektNotizen.length > 0 || projektTermine.length > 0);

	// Inhalte nur im Blatt: solange keine Unterprojekte da sind.
	const darfInhalte = $derived(!!openId && !hatKinder);
	// Unterprojekt nur, solange das Projekt selbst keine eigenen Inhalte hat.
	const darfUnterprojekt = $derived(!openId || !hatInhalte);

	// --- Formular: (Unter-)Projekt anlegen ---
	let name = $state('');
	let beschreibung = $state('');
	let kategorie = $state<Category>('geschaeftlich');
	const kategorien: Category[] = ['geschaeftlich', 'privat', 'offen'];

	async function projektAnlegen() {
		const n = name.trim();
		if (!n) return;
		// Unterprojekt erbt die Kategorie des Elternprojekts; Wurzelprojekt nutzt die Auswahl.
		const cat = offen ? offen.category : kategorie;
		const p = await addProject({
			name: n,
			description: beschreibung,
			category: cat,
			parentId: openId ?? undefined
		});
		// Optimistisch sofort einblenden: sonst würde das Reset-$effect die gerade
		// gesetzte openId verwerfen, bevor die (asynchrone) liveQuery nachzieht.
		if (!projekte.some((x) => x.id === p.id)) projekte = [p, ...projekte];
		name = '';
		beschreibung = '';
		kategorie = 'geschaeftlich';
		openId = p.id; // direkt hineinspringen
	}

	// --- Formular: Aufgabe (Notiz mit optionaler Frist) ---
	let aufgabeText = $state('');
	let aufgabeFrist = $state(''); // datetime-local
	async function aufgabeSpeichern() {
		const inhalt = aufgabeText.trim();
		if (!inhalt || !offen) return;
		const due = aufgabeFrist ? new Date(aufgabeFrist).getTime() : null;
		await addNote({ content: inhalt, category: offen.category, projectId: offen.id, dueAt: due });
		aufgabeText = '';
		aufgabeFrist = '';
	}

	// --- Formular: Termin ---
	let terminTitel = $state('');
	let terminWann = $state('');
	let terminOrt = $state('');
	async function terminAnlegen() {
		const t = terminTitel.trim();
		const ms = terminWann ? new Date(terminWann).getTime() : NaN;
		if (!t || Number.isNaN(ms) || !offen) return;
		await addAppointment({
			title: t,
			startAt: ms,
			location: terminOrt,
			category: offen.category,
			projectId: offen.id
		});
		terminTitel = '';
		terminWann = '';
		terminOrt = '';
	}

	async function projektLoeschen(id: string) {
		await deleteProject(id);
		if (openId === id) openId = null;
	}

	function fmtDatumZeit(ms: number): string {
		return new Date(ms).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	function fmtDatum(ms: number): string {
		return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
	}
	// Offene Aufgabe, deren Frist in der Vergangenheit liegt.
	function ueberfaellig(n: Note): boolean {
		return isOpen(n) && n.dueAt != null && n.dueAt < Date.now();
	}
	function istOrdner(id: string): boolean {
		return (kindAnzahl.get(id) ?? 0) > 0;
	}
	// Zusammenfassung für eine Projekt-Zeile als EIN String (sonst zerlegen die
	// {#if}-Anker den Text in mehrere Knoten → schwer auffindbar/lesbar).
	function zusammenfassung(p: Project): string {
		const base = istOrdner(p.id)
			? `${kindAnzahl.get(p.id) ?? 0} Unterprojekte`
			: `${notizAnzahl.get(p.id) ?? 0} Aufgaben · ${terminAnzahl.get(p.id) ?? 0} Termine`;
		return p.archived ? `${base} · archiviert` : base;
	}
</script>

<section class="space-y-4">
	{#if offen}
		<!-- Breadcrumb -->
		<nav class="flex flex-wrap items-center gap-1 text-sm" aria-label="Projektpfad">
			<button
				type="button"
				onclick={() => (openId = null)}
				class="text-zinc-400 transition-colors hover:text-zinc-100">Projekte</button
			>
			{#each pfad as p, i (p.id)}
				<Icon name="chevronLeft" class="h-3 w-3 rotate-180 text-zinc-600" />
				{#if i < pfad.length - 1}
					<button
						type="button"
						onclick={() => (openId = p.id)}
						class="truncate text-zinc-400 transition-colors hover:text-zinc-100">{p.name}</button
					>
				{:else}
					<span class="truncate font-medium text-zinc-100">{p.name}</span>
				{/if}
			{/each}
		</nav>

		<!-- Kopf des offenen Projekts -->
		<div class="card p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h2 class="truncate text-xl font-bold tracking-tight">{offen.name}</h2>
					{#if offen.description}
						<p class="mt-0.5 text-xs text-zinc-400">{offen.description}</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<span class="chip px-2 py-0.5 {categoryBadge[offen.category]}"
						>{categoryLabel[offen.category]}</span
					>
					<button
						type="button"
						onclick={() => setProjectArchived(offen.id, !offen.archived)}
						aria-label={offen.archived ? 'Wieder aufnehmen' : 'Archivieren'}
						class="text-zinc-600 transition-colors hover:text-zinc-300"
					>
						<Icon name="archive" class="h-4 w-4" />
					</button>
					<button
						type="button"
						onclick={() => projektLoeschen(offen.id)}
						aria-label="Projekt löschen"
						class="text-zinc-600 transition-colors hover:text-rose-400"
					>
						<Icon name="x" class="h-4 w-4" />
					</button>
				</div>
			</div>
			{#if offen.archived}
				<p class="mt-2 text-xs text-zinc-500">Archiviert — Inhalte bleiben erhalten.</p>
			{/if}
		</div>

		<!-- Unterprojekte (Ordner-Charakter) -->
		{#if hatKinder || kinder.length > 0}
			<div class="space-y-2">
				<h3 class="px-1 text-sm font-medium text-zinc-300">Unterprojekte</h3>
				{#each kinder as p (p.id)}
					{@render projektZeile(p)}
				{/each}
			</div>
		{/if}

		{#if darfUnterprojekt}
			<div class="card space-y-2.5 p-4">
				<h3 class="flex items-center gap-2 text-sm font-medium text-zinc-300">
					<Icon name="folder" class="h-4 w-4 text-zinc-500" /> Unterprojekt anlegen
				</h3>
				<input
					bind:value={name}
					placeholder="Name des Unterprojekts"
					onkeydown={(e) => {
						if (e.key === 'Enter') projektAnlegen();
					}}
					class="field"
				/>
				<input bind:value={beschreibung} placeholder="Beschreibung (optional)" class="field" />
				<div class="flex justify-end">
					<button
						type="button"
						onclick={projektAnlegen}
						disabled={!name.trim()}
						class="btn-primary">Unterprojekt anlegen</button
					>
				</div>
			</div>
		{/if}

		<!-- Arbeitsbereich: Aufgaben + Termine (nur im Blatt) -->
		{#if darfInhalte}
			<!-- Aufgabe anlegen -->
			<div class="card space-y-2.5 p-4">
				<h3 class="flex items-center gap-2 text-sm font-medium text-zinc-300">
					<Icon name="check" class="h-4 w-4 text-zinc-500" /> Aufgabe
				</h3>
				<textarea
					bind:value={aufgabeText}
					rows="2"
					placeholder="Was ist zu tun?"
					class="field resize-none"
				></textarea>
				<div class="flex items-center justify-between gap-2">
					<label class="flex items-center gap-1.5 text-xs text-zinc-400">
						<Icon name="flag" class="h-3.5 w-3.5" /> Frist
						<input
							bind:value={aufgabeFrist}
							type="datetime-local"
							aria-label="Frist"
							class="field py-1"
						/>
					</label>
					<button
						type="button"
						onclick={aufgabeSpeichern}
						disabled={!aufgabeText.trim()}
						class="btn-primary">Aufgabe hinzufügen</button
					>
				</div>
			</div>

			<!-- Aufgabenliste -->
			<div class="space-y-2">
				<h3 class="px-1 text-sm font-medium text-zinc-300">
					Aufgaben {#if aufgaben.length > 0}({aufgaben.length}){/if}
				</h3>
				{#if aufgaben.length === 0}
					<p class="px-1 text-sm text-zinc-500">Noch keine Aufgaben in diesem Projekt.</p>
				{/if}
				{#each aufgaben as n (n.id)}
					<div class="card p-3.5 {isOpen(n) ? '' : 'opacity-60'}">
						<div class="flex items-start gap-3">
							<button
								type="button"
								onclick={() => setNoteCompleted(n.id, isOpen(n))}
								aria-label={isOpen(n) ? 'Als erledigt markieren' : 'Wieder öffnen'}
								class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors {isOpen(
									n
								)
									? 'border-zinc-600 text-transparent hover:border-zinc-400'
									: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'}"
							>
								<Icon name="check" class="h-3.5 w-3.5" />
							</button>
							<div class="min-w-0 flex-1">
								<p
									class="text-sm whitespace-pre-wrap {isOpen(n)
										? 'text-zinc-100'
										: 'text-zinc-400 line-through'}"
								>
									{n.content}
								</p>
								<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
									{#if n.dueAt}
										<span
											class="flex items-center gap-1 {ueberfaellig(n)
												? 'font-medium text-rose-400'
												: 'text-zinc-500'}"
										>
											<Icon name="flag" class="h-3.5 w-3.5" />
											fällig {fmtDatumZeit(n.dueAt)}{#if ueberfaellig(n)}
												· überfällig{/if}
										</span>
									{/if}
									<span class="text-zinc-600">erstellt {fmtDatum(n.createdAt)}</span>
									{#if !isOpen(n) && n.completedAt}
										<span class="flex items-center gap-1 text-emerald-400/80">
											<Icon name="check" class="h-3.5 w-3.5" /> erledigt {fmtDatumZeit(n.completedAt)}
										</span>
									{/if}
								</div>
							</div>
							<button
								type="button"
								onclick={() => softDeleteNote(n.id)}
								aria-label="Aufgabe löschen"
								class="shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
							>
								<Icon name="x" class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Termin anlegen -->
			<div class="card space-y-2.5 p-4">
				<h3 class="flex items-center gap-2 text-sm font-medium text-zinc-300">
					<Icon name="calendar" class="h-4 w-4 text-zinc-500" /> Termin
				</h3>
				<input bind:value={terminTitel} placeholder="Titel" class="field" />
				<label class="flex flex-col gap-1 text-xs text-zinc-400">
					Wann (einzuhaltende Frist)
					<input bind:value={terminWann} type="datetime-local" class="field" />
				</label>
				<input bind:value={terminOrt} placeholder="Ort (optional)" class="field" />
				<div class="flex justify-end">
					<button
						type="button"
						onclick={terminAnlegen}
						disabled={!terminTitel.trim() || !terminWann}
						class="btn-primary">Termin anlegen</button
					>
				</div>
			</div>

			<!-- Terminliste -->
			{#if projektTermine.length > 0}
				<div class="space-y-2">
					<h3 class="px-1 text-sm font-medium text-zinc-300">Termine ({projektTermine.length})</h3>
					{#each projektTermine as t (t.id)}
						<div class="card p-3.5">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-zinc-100">{t.title}</p>
									<p class="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
										<Icon name="clock" class="h-3.5 w-3.5" />
										{fmtDatumZeit(t.startAt)}
										{#if t.location}
											<Icon name="mapPin" class="ml-1 h-3.5 w-3.5" />
											{t.location}
										{/if}
									</p>
								</div>
								<button
									type="button"
									onclick={() => deleteAppointment(t.id)}
									aria-label="Termin löschen"
									class="shrink-0 text-zinc-600 transition-colors hover:text-rose-400"
								>
									<Icon name="x" class="h-4 w-4" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	{:else}
		<!-- Oberste Ebene: Wurzelprojekte -->
		<h2 class="text-2xl font-bold tracking-tight">Projekte</h2>

		<div class="card space-y-2.5 p-4">
			<input
				bind:value={name}
				placeholder="Projektname"
				onkeydown={(e) => {
					if (e.key === 'Enter') projektAnlegen();
				}}
				class="field"
			/>
			<input bind:value={beschreibung} placeholder="Beschreibung (optional)" class="field" />
			<div class="flex items-center justify-between gap-2">
				<div class="flex gap-1" role="group" aria-label="Projekt-Kategorie wählen">
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
				<button type="button" onclick={projektAnlegen} disabled={!name.trim()} class="btn-primary">
					Anlegen
				</button>
			</div>
		</div>

		{#if kinder.length === 0}
			<p class="px-1 text-sm text-zinc-500">
				Noch keine Projekte in dieser Sicht — leg oben dein erstes an.
			</p>
		{/if}

		<div class="space-y-2">
			{#each kinder as p (p.id)}
				{@render projektZeile(p)}
			{/each}
		</div>
	{/if}
</section>

<!-- Eine Projekt-Zeile in einer Liste (Ordner oder Blatt). -->
{#snippet projektZeile(p: Project)}
	<div class="card flex items-center gap-3 p-3.5 {p.archived ? 'opacity-60' : ''}">
		<button
			type="button"
			onclick={() => (openId = p.id)}
			class="flex min-w-0 flex-1 items-center gap-3 text-left"
		>
			<span
				class="grid h-9 w-9 shrink-0 place-items-center rounded-xl {p.category === 'privat'
					? 'bg-amber-400/15 text-amber-300'
					: p.category === 'geschaeftlich'
						? 'bg-sky-400/15 text-sky-300'
						: 'bg-white/[0.06] text-zinc-400'}"
			>
				<Icon name="folder" class="h-4.5 w-4.5" />
			</span>
			<span class="min-w-0">
				<span class="block truncate text-sm font-medium text-zinc-100">{p.name}</span>
				<span class="block text-xs text-zinc-500">{zusammenfassung(p)}</span>
			</span>
		</button>
		<div class="flex shrink-0 gap-2 text-zinc-600">
			<button
				type="button"
				onclick={() => setProjectArchived(p.id, !p.archived)}
				aria-label={p.archived ? 'Wieder aufnehmen' : 'Archivieren'}
				class="transition-colors hover:text-zinc-300"
			>
				<Icon name="archive" class="h-4 w-4" />
			</button>
			<button
				type="button"
				onclick={() => projektLoeschen(p.id)}
				aria-label="Projekt löschen"
				class="transition-colors hover:text-rose-400"
			>
				<Icon name="x" class="h-4 w-4" />
			</button>
		</div>
	</div>
{/snippet}
