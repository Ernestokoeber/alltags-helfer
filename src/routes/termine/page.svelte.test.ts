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
import { addProject } from '$lib/db/projects';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.appointments.clear();
	await db.prepTasks.clear();
	await db.projects.clear();
});

describe('Termine-Seite – Projektzuordnung', () => {
	it('legt einen Termin mit Projektbezug an (Kategorie folgt dem Projekt)', async () => {
		const projekt = await addProject({ name: 'Webseite', category: 'geschaeftlich' });

		render(Page);

		await fireEvent.input(screen.getByPlaceholderText('Titel'), { target: { value: 'Launch' } });
		await fireEvent.input(screen.getByLabelText('Wann'), {
			target: { value: '2026-07-01T10:00' }
		});

		const select = screen.getByLabelText('Projekt für Termin') as HTMLSelectElement;
		const option = (await within(select).findByRole('option', {
			name: 'Webseite'
		})) as HTMLOptionElement;
		// Svelte speichert den Options-Wert als __value-Property → userEvent.selectOptions
		// löst die Bindung zuverlässig aus (Option als Element übergeben).
		await userEvent.selectOptions(select, option);

		await fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

		await waitFor(async () => {
			const apps = await db.appointments.toArray();
			expect(apps).toHaveLength(1);
			expect(apps[0].projectId).toBe(projekt.id);
			expect(apps[0].category).toBe('geschaeftlich');
		});
	});
});

describe('Termine-Seite – Wiederholung', () => {
	it('legt einen täglich wiederkehrenden Termin an', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText('Titel'), { target: { value: 'Standup' } });
		await fireEvent.input(screen.getByLabelText('Wann'), {
			target: { value: '2026-07-01T09:00' }
		});
		const grp = screen.getByRole('group', { name: 'Wiederholung wählen' });
		await fireEvent.click(within(grp).getByRole('button', { name: 'Täglich' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

		await waitFor(async () => {
			const apps = await db.appointments.toArray();
			expect(apps).toHaveLength(1);
			expect(apps[0].recurrence).toBe('daily');
		});
	});
});
