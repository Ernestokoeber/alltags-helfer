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
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			// SvelteKit-$app-Module gibt es im Test (ohne SvelteKit-Plugin) nicht →
			// auf schlanke Stubs mappen, damit Komponententests sie importieren können.
			'$app/state': fileURLToPath(new URL('./vitest-stubs/app-state.ts', import.meta.url)),
			'$app/navigation': fileURLToPath(new URL('./vitest-stubs/app-navigation.ts', import.meta.url)),
			'$app/paths': fileURLToPath(new URL('./vitest-stubs/app-paths.ts', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
		setupFiles: ['./vitest-setup.ts']
	}
});
