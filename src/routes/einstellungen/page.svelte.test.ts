// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { BACKUP_APP, BACKUP_SCHEMA } from '$lib/db/backup';

afterEach(() => cleanup());
beforeEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
});

// Datei in den (versteckten) Import-Input legen und change auslösen.
async function dateiWaehlen(inhalt: string) {
	const input = screen.getByLabelText('Sicherungsdatei wählen') as HTMLInputElement;
	const file = new File([inhalt], 'backup.json', { type: 'application/json' });
	Object.defineProperty(input, 'files', { value: [file], configurable: true });
	await fireEvent.change(input);
}

describe('Einstellungen – Datensicherung', () => {
	it('importiert eine gültige Sicherung und zeigt das Ergebnis', async () => {
		render(Page);
		const backup = {
			app: BACKUP_APP,
			schema: BACKUP_SCHEMA,
			exportedAt: Date.now(),
			data: {
				notes: [
					{
						id: 'n1',
						content: 'aus Sicherung',
						type: 'text',
						category: 'privat',
						pinned: false,
						importance: 0,
						tags: [],
						createdAt: 1,
						updatedAt: 1,
						deletedAt: null
					}
				]
			}
		};
		await dateiWaehlen(JSON.stringify(backup));

		await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 neu'));
		expect(await db.notes.count()).toBe(1);
	});

	it('zeigt bei einer ungültigen Datei eine Fehlermeldung', async () => {
		render(Page);
		await dateiWaehlen('{"app":"etwas-anderes"}');
		await waitFor(() =>
			expect(screen.getByRole('alert')).toHaveTextContent(/Keine gültige/)
		);
	});
});
