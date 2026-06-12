// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { addProject } from '$lib/db/projects';
import { addNote } from '$lib/db/notes';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.projects.clear();
	await db.notes.clear();
});

describe('Projekte-Seite', () => {
	it('legt ein Projekt an und öffnet direkt die Detailansicht', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText('Projektname'), {
			target: { value: 'Projekt Atlas' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

		// Detailansicht: Projektname als Überschrift + Notiz-Eingabe.
		await waitFor(() =>
			expect(screen.getByRole('heading', { name: 'Projekt Atlas' })).toBeInTheDocument()
		);
		expect(screen.getByPlaceholderText('Was gibt es Neues im Projekt?')).toBeInTheDocument();

		const inDb = await db.projects.toArray();
		expect(inDb).toHaveLength(1);
		expect(inDb[0].category).toBe('geschaeftlich'); // Standard: Arbeit
	});

	it('speichert eine Notiz im geöffneten Projekt (erbt die Projekt-Kategorie)', async () => {
		const p = await addProject({ name: 'Atlas', category: 'geschaeftlich' });
		render(Page);

		// Projekt aus der Liste öffnen.
		await waitFor(() => expect(screen.getByText('Atlas')).toBeInTheDocument());
		await fireEvent.click(screen.getByText('Atlas'));

		const feld = await screen.findByPlaceholderText('Was gibt es Neues im Projekt?');
		await fireEvent.input(feld, { target: { value: 'Kickoff war erfolgreich' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

		await waitFor(() => expect(screen.getByText('Kickoff war erfolgreich')).toBeInTheDocument());
		const notizen = await db.notes.toArray();
		expect(notizen).toHaveLength(1);
		expect(notizen[0].projectId).toBe(p.id);
		expect(notizen[0].category).toBe('geschaeftlich');
	});

	it('zeigt die Notiz-Anzahl je Projekt in der Liste', async () => {
		const p = await addProject({ name: 'Atlas' });
		await addNote({ content: 'eins', projectId: p.id });
		await addNote({ content: 'zwei', projectId: p.id });

		render(Page);

		await waitFor(() => expect(screen.getByText('2 Notizen')).toBeInTheDocument());
	});
});
