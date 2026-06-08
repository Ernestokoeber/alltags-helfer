// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { addBucketItem, toggleBucketDone } from '$lib/db/bucket';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.bucketItems.clear();
});

describe('Bucketlist-Seite', () => {
	it('legt einen Eintrag mit Beschreibung, Zieldatum und Kategorie an', async () => {
		render(Page);

		await fireEvent.input(screen.getByPlaceholderText('Was möchtest du erleben?'), {
			target: { value: 'Island bereisen' }
		});
		await fireEvent.input(screen.getByPlaceholderText('Beschreibung (optional)'), {
			target: { value: 'Ringstraße mit dem Camper' }
		});
		await fireEvent.input(screen.getByLabelText(/Zieldatum/), {
			target: { value: '2026-08-15' }
		});
		const katGruppe = screen.getByRole('group', { name: 'Kategorie wählen' });
		await fireEvent.click(within(katGruppe).getByRole('button', { name: 'Privat' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

		// In der Liste sichtbar (Titel + Beschreibung).
		await waitFor(() => expect(screen.getByText('Island bereisen')).toBeInTheDocument());
		expect(screen.getByText('Ringstraße mit dem Camper')).toBeInTheDocument();

		// In der DB mit allen Detailfeldern (title ist nicht indexiert → toArray + Filter).
		const alle = await db.bucketItems.toArray();
		const inDb = alle.filter((b) => b.title === 'Island bereisen');
		expect(inDb).toHaveLength(1);
		expect(inDb[0].category).toBe('privat');
		expect(inDb[0].targetDate).toBe(new Date(2026, 7, 15).getTime());
	});

	it('blendet erledigte Einträge auf Wunsch aus', async () => {
		await addBucketItem({ title: 'offen-item' });
		const fertig = await addBucketItem({ title: 'erledigt-item' });
		await toggleBucketDone(fertig.id, true);

		render(Page);

		await waitFor(() => expect(screen.getByText('erledigt-item')).toBeInTheDocument());

		await fireEvent.click(screen.getByRole('button', { name: /Erledigte ausblenden/ }));

		await waitFor(() => expect(screen.queryByText('erledigt-item')).not.toBeInTheDocument());
		expect(screen.getByText('offen-item')).toBeInTheDocument();
	});
});
