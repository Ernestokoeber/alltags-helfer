// @vitest-environment jsdom
// jsdom statt happy-dom: happy-dom unterstützt den :checked-Selektor für
// <option> nicht, den Sveltes select-Bindung im change-Handler nutzt → die
// Projektauswahl käme sonst nicht im State an.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { addNote } from '$lib/db/notes';
import { addProject } from '$lib/db/projects';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.notes.clear();
	await db.projects.clear();
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

describe('Notizen-Seite – Schnellnotiz mit Projekt', () => {
	it('legt eine Schnellnotiz direkt in einem Blatt-Projekt an (erbt Kategorie)', async () => {
		const itm = await addProject({ name: 'ITM' });
		const sub = await addProject({
			name: 'Auslagern24.de',
			parentId: itm.id,
			category: 'geschaeftlich'
		});

		render(Page);

		// Projektoptionen kommen aus pickerProjects (liveQuery) → Blatt abwarten.
		const select = screen.getByLabelText('Projekt für Notiz') as HTMLSelectElement;
		const option = (await within(select).findByRole('option', {
			name: 'ITM › Auslagern24.de'
		})) as HTMLOptionElement;

		await fireEvent.input(screen.getByPlaceholderText('Schnelle Notiz …'), {
			target: { value: 'API-Schlüssel anfragen' }
		});
		// Svelte speichert den Options-Wert als __value-Property → userEvent.selectOptions
		// löst die Bindung zuverlässig aus (Option als Element übergeben).
		await userEvent.selectOptions(select, option);
		await fireEvent.click(screen.getByRole('button', { name: 'Notiz anlegen' }));

		await waitFor(async () => {
			const notes = await db.notes.toArray();
			expect(notes).toHaveLength(1);
			expect(notes[0].projectId).toBe(sub.id);
			expect(notes[0].category).toBe('geschaeftlich');
		});
	});
});

describe('Notizen-Seite – Notiz öffnen', () => {
	it('öffnet die Notiz im Modal mit Bearbeiten-Umschalter', async () => {
		await addNote({ content: 'Notiz zum Öffnen', category: 'offen' });

		render(Page);

		await waitFor(() => expect(screen.getByText('Notiz zum Öffnen')).toBeInTheDocument());
		await fireEvent.click(screen.getByRole('button', { name: 'Notiz öffnen' }));

		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByRole('button', { name: /Bearbeiten/ })).toBeInTheDocument();
	});
});
