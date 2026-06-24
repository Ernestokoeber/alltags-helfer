import { defineConfig, devices } from '@playwright/test';

// E2E-Smoke gegen den Dev-Server. Kollidiert NICHT mit vitest: vitest sammelt nur
// `src/**`, Playwright nur `e2e/`. Nur Chromium — ein Smoke, keine Browser-Matrix.
// Im dev ist `paths.base` leer → Routen liegen direkt unter `/`.
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// Höher als der Default (5 s): der erste Request kompiliert die Route im Dev-Server
	// erst (Kaltstart) und kann sonst knapp ins Timeout laufen.
	expect: { timeout: 10_000 },
	reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
