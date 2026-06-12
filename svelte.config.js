import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		// SPA-Modus: alle Routen landen in der Fallback-Shell, Client-seitiges Routing.
		// 404.html statt 200.html, weil GitHub Pages unbekannte Pfade darüber ausliefert —
		// so funktionieren Deep-Links auch dort. Passt zur local-first PWA (kein SSR).
		adapter: adapter({ fallback: '404.html' }),
		paths: {
			// GitHub Pages serviert unter /<repo-name>/ — der Workflow setzt BASE_PATH.
			// Lokal (dev/preview/Tests) bleibt die Basis leer.
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;
