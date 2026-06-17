// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Panel from './PanelAufgaben.svelte';
import { db } from '$lib/db/db';
import { addNote } from '$lib/db/notes';

afterEach(() => cleanup());
beforeEach(async () => {
	await db.notes.clear();
	await db.projects.clear();
});

describe('PanelAufgaben', () => {
	it('zeigt offene Aufgaben mit Frist, ignoriert lose Notizen', async () => {
		await addNote({ content: 'Server patchen', dueAt: Date.now() + 86_400_000 });
		await addNote({ content: 'nur eine Notiz' }); // kein Projekt, keine Frist

		render(Panel);

		await waitFor(() => expect(screen.getByText('Server patchen')).toBeInTheDocument());
		expect(screen.queryByText('nur eine Notiz')).not.toBeInTheDocument();
	});
});
