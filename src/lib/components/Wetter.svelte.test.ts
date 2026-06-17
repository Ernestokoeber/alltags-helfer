// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Wetter from './Wetter.svelte';

beforeEach(() => {
	// Ohne Geolocation darf die Komponente weder das Netz aufrufen noch Daten zeigen.
	Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
});
afterEach(() => cleanup());

describe('Wetter', () => {
	it('blendet sich ohne Geolocation aus (kein Crash, keine Daten)', async () => {
		render(Wetter);
		await waitFor(() => expect(screen.queryByText('Wetter …')).not.toBeInTheDocument());
		expect(document.body.textContent ?? '').not.toContain('°');
	});
});
