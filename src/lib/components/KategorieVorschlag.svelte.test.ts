// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import KategorieVorschlag from './KategorieVorschlag.svelte';
import { db } from '$lib/db/db';
import { addNote } from '$lib/db/notes';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.notes.clear();
});

describe('KategorieVorschlag (UI)', () => {
	it('zeigt einen Vorschlag für eine offene, geschäftlich klingende Notiz', async () => {
		const note = await addNote({ content: 'Meeting mit dem Kunden vorbereiten', category: 'offen' });
		render(KategorieVorschlag, { props: { note } });
		// 'geschaeftlich' wird in der UI als „Arbeit" angezeigt.
		expect(screen.getByText(/Arbeit/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Übernehmen' })).toBeInTheDocument();
	});

	it('übernimmt den Vorschlag per Klick und setzt die Kategorie in der DB', async () => {
		const note = await addNote({ content: 'Meeting mit dem Kunden vorbereiten', category: 'offen' });
		render(KategorieVorschlag, { props: { note } });

		await fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));

		await waitFor(async () => {
			const aus = await db.notes.get(note.id);
			expect(aus?.category).toBe('geschaeftlich');
		});
	});

	it('zeigt nichts für eine bereits kategorisierte Notiz', async () => {
		const note = await addNote({ content: 'Meeting mit dem Kunden', category: 'privat' });
		const { container } = render(KategorieVorschlag, { props: { note } });
		expect(container.textContent?.trim()).toBe('');
	});
});
