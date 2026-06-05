import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'node:url';

// Eigene Vitest-Konfiguration: Svelte-Plugin (kompiliert .svelte für
// Komponententests) + $lib-Alias. Datenschicht-Tests laufen in Node,
// Komponententests setzen oben `// @vitest-environment happy-dom`.
export default defineConfig({
	plugins: [svelte(), svelteTesting()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
		setupFiles: ['./vitest-setup.ts']
	}
});
