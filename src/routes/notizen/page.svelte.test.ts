// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { addNote } from '$lib/db/notes';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.notes.clear();
});

describe('Notizen-Seite – Kategoriefilter', () => {
	it('zeigt nach Klick auf „Privat“ nur private Notizen', async () => {
		await addNote({ content: 'Geschenk für Mama', category: 'privat' });
		await addNote({ content: 'Rechnung an Kunde', category: 'geschaeftlich' });

		render(Page);

		// Beide Notizen erscheinen zunächst (Filter „Alle“).
		await waitFor(() => expect(screen.getByText('Geschenk für Mama')).toBeInTheDocument());
		expect(screen.getByText('Rechnung an Kunde')).toBeInTheDocument();

		// Nur den Filter-Chip in der Filtergruppe treffen (es gibt auch einen
		// Kategorie-Umschalt-Button mit Text „Privat“ auf der Notiz selbst).
		const filterGruppe = screen.getByRole('group', { name: 'Notizen nach Kategorie filtern' });
		await fireEvent.click(within(filterGruppe).getByRole('button', { name: 'Privat' }));

		await waitFor(() =>
			expect(screen.queryByText('Rechnung an Kunde')).not.toBeInTheDocument()
		);
		expect(screen.getByText('Geschenk für Mama')).toBeInTheDocument();
	});
});
