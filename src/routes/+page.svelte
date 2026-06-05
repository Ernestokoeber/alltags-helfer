<script lang="ts">
	// "Heute"-Übersicht. Datum/Begrüßung clientseitig (ssr=false), echte
	// Inhalte (Schnellnotiz, Schlaf, Termine) folgen ab Phase P1.
	const heute = new Date();
	const datum = heute.toLocaleDateString('de-DE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
	const stunde = heute.getHours();
	const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Guten Tag' : 'Guten Abend';
</script>

<section class="space-y-6">
	<div>
		<p class="text-sm text-stone-500">{datum}</p>
		<h2 class="text-2xl font-semibold">{gruss}.</h2>
	</div>

	<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<h3 class="text-sm font-medium text-stone-700">Schnellnotiz für heute</h3>
		<p class="mt-1 text-sm text-stone-400">
			Bald kannst du hier per Tastatur oder Sprache eine Notiz erfassen (P1/P2).
		</p>
	</div>

	<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<h3 class="text-sm font-medium text-stone-700">Schlaf</h3>
		<p class="mt-1 text-sm text-stone-400">
			Trag morgens deine Schlafzeiten ein — Auswertung folgt in Phase 4.
		</p>
	</div>

	<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
		<h3 class="text-sm font-medium text-stone-700">Anstehende Termine</h3>
		<p class="mt-1 text-sm text-stone-400">Terminverwaltung folgt in Phase 3.</p>
	</div>
</section>
