// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Page from './+page.svelte';
import { db } from '$lib/db/db';
import { saveSleepEntry } from '$lib/db/sleep';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.sleepEntries.clear();
});

describe('Schlaf-Seite', () => {
	it('zeigt den Wochenschnitt der Schlafdauer', async () => {
		await saveSleepEntry({ date: '2026-06-01', bedTime: '23:00', wakeTime: '07:00', quality: 4 }); // 480
		await saveSleepEntry({ date: '2026-06-02', bedTime: '23:00', wakeTime: '06:00', quality: 4 }); // 420

		render(Page);

		// (480 + 420) / 2 = 450 min → 7 h 30 min
		await waitFor(() => expect(screen.getByText('Ø 7 h 30 min')).toBeInTheDocument());
	});

	it('lädt einen Eintrag per „Bearbeiten“ ins Formular', async () => {
		await saveSleepEntry({
			date: '2026-06-01',
			bedTime: '22:00',
			wakeTime: '06:30',
			quality: 3,
			note: 'müde'
		});

		render(Page);

		await waitFor(() => expect(screen.getByText(/01\.06\./)).toBeInTheDocument());
		await fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));

		expect((screen.getByLabelText('Datum') as HTMLInputElement).value).toBe('2026-06-01');
		expect((screen.getByLabelText('Zu Bett') as HTMLInputElement).value).toBe('22:00');
		expect((screen.getByLabelText('Aufgewacht') as HTMLInputElement).value).toBe('06:30');
	});
});
