// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Panel from './PanelNotizen.svelte';
import { db } from '$lib/db/db';
import { addNote } from '$lib/db/notes';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.notes.clear();
});

describe('PanelNotizen', () => {
	it('zeigt vorhandene Notizen', async () => {
		await addNote({ content: 'Idee für Dashboard' });

		render(Panel);

		await waitFor(() => expect(screen.getByText('Idee für Dashboard')).toBeInTheDocument());
	});
});
