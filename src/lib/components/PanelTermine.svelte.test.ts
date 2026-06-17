// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Panel from './PanelTermine.svelte';
import { db } from '$lib/db/db';
import { addAppointment } from '$lib/db/appointments';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.appointments.clear();
});

describe('PanelTermine', () => {
	it('zeigt anstehende Termine, ignoriert vergangene', async () => {
		await addAppointment({ title: 'Zahnarzt', startAt: Date.now() + 86_400_000 });
		await addAppointment({ title: 'Alter Termin', startAt: Date.now() - 86_400_000 });

		render(Panel);

		await waitFor(() => expect(screen.getByText('Zahnarzt')).toBeInTheDocument());
		expect(screen.queryByText('Alter Termin')).not.toBeInTheDocument();
	});
});
