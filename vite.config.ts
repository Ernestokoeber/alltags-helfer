import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: true,
		// Der sshfs-Mount der VM liefert keine inotify-Events → ohne Polling
		// erkennt Vite Dateiänderungen nicht und HMR bleibt aus.
		watch: { usePolling: true, interval: 150 }
	}
});
