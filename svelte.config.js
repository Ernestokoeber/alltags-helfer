import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		// SPA-Modus: alle Routen landen in 200.html, Client-seitiges Routing.
		// Passt zur local-first PWA (kein Server-Rendering, Daten leben im Browser).
		adapter: adapter({ fallback: '200.html' })
	}
};

export default config;
