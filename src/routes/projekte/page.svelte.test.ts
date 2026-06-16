// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { addProject } from '$lib/db/projects';
import { addNote } from '$lib/db/notes';
import { addAppointment } from '$lib/db/appointments';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.projects.clear();
	await db.notes.clear();
	await db.appointments.clear();
});

describe('Projekte-Seite', () => {
	it('legt ein Wurzelprojekt an und öffnet es direkt', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText('Projektname'), {
			target: { value: 'Projekt Atlas' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

		// Detailansicht: Projektname als Überschrift + Aufgaben-Eingabe (frisches Blatt).
		await waitFor(() =>
			expect(screen.getByRole('heading', { name: 'Projekt Atlas' })).toBeInTheDocument()
		);
		expect(screen.getByPlaceholderText('Was ist zu tun?')).toBeInTheDocument();

		const inDb = await db.projects.toArray();
		expect(inDb).toHaveLength(1);
		expect(inDb[0].category).toBe('geschaeftlich'); // Standard: Arbeit
		expect(inDb[0].parentId).toBeUndefined(); // Wurzelprojekt
	});

	it('legt ein Unterprojekt an (Hierarchie) und springt hinein', async () => {
		const itm = await addProject({ name: 'ITM' });
		render(Page);

		// ITM aus der Wurzelliste öffnen.
		await waitFor(() => expect(screen.getByText('ITM')).toBeInTheDocument());
		await fireEvent.click(screen.getByText('ITM'));

		// Unterprojekt anlegen.
		const feld = await screen.findByPlaceholderText('Name des Unterprojekts');
		await fireEvent.input(feld, { target: { value: 'Auslagern24.de' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Unterprojekt anlegen' }));

		// Jetzt im Unterprojekt: Überschrift + Breadcrumb zurück zu ITM.
		await waitFor(() =>
			expect(screen.getByRole('heading', { name: 'Auslagern24.de' })).toBeInTheDocument()
		);
		expect(screen.getByRole('button', { name: 'ITM' })).toBeInTheDocument();

		const sub = (await db.projects.toArray()).find((p) => p.name === 'Auslagern24.de');
		expect(sub?.parentId).toBe(itm.id);
		expect(sub?.category).toBe('geschaeftlich'); // erbt Kategorie des Elternprojekts
	});

	it('speichert eine Aufgabe und markiert sie als erledigt', async () => {
		const p = await addProject({ name: 'Atlas' });
		render(Page);

		await waitFor(() => expect(screen.getByText('Atlas')).toBeInTheDocument());
		await fireEvent.click(screen.getByText('Atlas'));

		const feld = await screen.findByPlaceholderText('Was ist zu tun?');
		await fireEvent.input(feld, { target: { value: 'Doku schreiben' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Aufgabe hinzufügen' }));

		await waitFor(() => expect(screen.getByText('Doku schreiben')).toBeInTheDocument());
		const notizen = await db.notes.toArray();
		expect(notizen).toHaveLength(1);
		expect(notizen[0].projectId).toBe(p.id);
		expect(notizen[0].completedAt).toBeNull(); // anfangs offen

		// Als erledigt markieren.
		await fireEvent.click(screen.getByRole('button', { name: 'Als erledigt markieren' }));
		await waitFor(async () => {
			const n = (await db.notes.toArray())[0];
			expect(n.completedAt).toBeTypeOf('number');
		});
	});

	it('zeigt in der Liste Aufgaben/Termine im Blatt und Unterprojekte im Ordner', async () => {
		// Blatt mit Inhalten
		const atlas = await addProject({ name: 'Atlas' });
		await addNote({ content: 'eins', projectId: atlas.id });
		await addNote({ content: 'zwei', projectId: atlas.id });
		await addAppointment({ title: 'Kickoff', startAt: Date.now() + 1000, projectId: atlas.id });
		// Ordner mit einem Unterprojekt
		const itm = await addProject({ name: 'ITM' });
		await addProject({ name: 'Auslagern24.de', parentId: itm.id });

		render(Page);

		// Beide Zähler stammen aus getrennten liveQueries (Notizen/Termine vs.
		// Unterprojekte), die unabhängig auflösen → beide im selben waitFor abwarten.
		await waitFor(() => {
			expect(screen.getByText('2 Aufgaben · 1 Termine')).toBeInTheDocument();
			expect(screen.getByText('1 Unterprojekte')).toBeInTheDocument();
		});
	});
});
