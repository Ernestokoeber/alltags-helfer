import { defineConfig } from 'vitest/config';

// Eigene Vitest-Konfiguration (lädt bewusst NICHT die SvelteKit/Tailwind-Plugins).
// Für die Datenschicht reichen Node + fake-indexeddb (kein Browser nötig).
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
		setupFiles: ['./vitest-setup.ts']
	}
});
