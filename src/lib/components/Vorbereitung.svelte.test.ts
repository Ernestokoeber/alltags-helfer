// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Vorbereitung from './Vorbereitung.svelte';
import { db } from '$lib/db/db';
import { addPrepTask } from '$lib/db/prep';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.prepTasks.clear();
});

describe('Vorbereitung (UI)', () => {
	it('fügt per Enter eine Aufgabe hinzu, die in der Liste erscheint und in der DB landet', async () => {
		render(Vorbereitung, { props: { appointmentId: 'a1' } });

		const input = screen.getByPlaceholderText('Vorbereitung hinzufügen');
		await fireEvent.input(input, { target: { value: 'Unterlagen drucken' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		await waitFor(() => expect(screen.getByText('Unterlagen drucken')).toBeInTheDocument());
		const inDb = await db.prepTasks.where('appointmentId').equals('a1').toArray();
		expect(inDb).toHaveLength(1);
	});

	it('zeigt nur die Aufgaben des jeweiligen Termins', async () => {
		await addPrepTask('other', 'fremd');
		await addPrepTask('a1', 'meine');

		render(Vorbereitung, { props: { appointmentId: 'a1' } });

		await waitFor(() => expect(screen.getByText('meine')).toBeInTheDocument());
		expect(screen.queryByText('fremd')).not.toBeInTheDocument();
	});
});
