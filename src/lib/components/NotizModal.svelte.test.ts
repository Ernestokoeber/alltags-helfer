// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import NotizModal from './NotizModal.svelte';
import type { Note } from '$lib/db/types';

function mkNote(): Note {
	return {
		id: 'n1',
		content: 'Voller Inhalt zum Lesen',
		type: 'text',
		category: 'offen',
		pinned: false,
		importance: 0,
		tags: [],
		createdAt: 1_700_000_000_000,
		updatedAt: 1_700_000_000_000,
		deletedAt: null
	};
}

afterEach(() => cleanup());

describe('NotizModal', () => {
	it('zeigt den Inhalt und einen Bearbeiten-Umschalter', () => {
		render(NotizModal, { props: { note: mkNote(), onClose: () => {} } });
		expect(screen.getByText('Voller Inhalt zum Lesen')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Bearbeiten/ })).toBeInTheDocument();
	});

	it('ruft onClose beim Schließen-Button auf', async () => {
		const onClose = vi.fn();
		render(NotizModal, { props: { note: mkNote(), onClose } });
		await fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
		expect(onClose).toHaveBeenCalled();
	});
});
