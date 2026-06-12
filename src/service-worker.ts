/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Eingebauter SvelteKit-Service-Worker (kein Plugin nötig). Macht die App
// offline-fähig: gebaute Assets werden beim Install vorgecacht, Navigationen
// fallen offline auf die SPA-Shell (404.html, siehe svelte.config.js) zurück.
import { base, build, files, prerendered, version } from '$service-worker';

// `self` ist im Worker-Kontext der ServiceWorkerGlobalScope.
const sw = self as unknown as ServiceWorkerGlobalScope;

// Pro Version ein eigener Cache → alte Versionen werden beim Activate entfernt.
const CACHE = `alltags-helfer-${version}`;

// Gebaute App-Dateien (immutable, versioniert) + statische Assets
// + prerenderte Routen-Shells (damit Deep-Links auch offline laden).
const PRECACHE = [...build, ...files, ...prerendered];
const PRECACHE_SET = new Set(PRECACHE);

// Pfad der SPA-Fallback-Shell (von adapter-static erzeugt), inkl. Basis-Pfad
// (auf GitHub Pages läuft die App unter /<repo-name>/).
const FALLBACK = `${base}/404.html`;

sw.addEventListener('install', (event) => {
	async function precache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(PRECACHE);
		// Fallback-Shell separat & tolerant cachen (fehlt sie, soll Install nicht scheitern).
		try {
			await cache.add(FALLBACK);
		} catch {
			// In manchen Umgebungen (z. B. reiner Dev-Server) existiert 404.html nicht.
		}
	}
	event.waitUntil(precache().then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	async function cleanup() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
		await sw.clients.claim();
	}
	event.waitUntil(cleanup());
});

sw.addEventListener('fetch', (event) => {
	// Nur GET und nur gleiche Herkunft cachen/abfangen.
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	async function respond(): Promise<Response> {
		const cache = await caches.open(CACHE);

		// Versionierte App-Assets: cache-first (ändern sich nie unter gleicher URL).
		if (PRECACHE_SET.has(url.pathname)) {
			const cached = await cache.match(url.pathname);
			if (cached) return cached;
		}

		// Sonst: Netz zuerst, Erfolg im Cache ablegen; offline → Cache/Fallback.
		try {
			const response = await fetch(event.request);
			if (response.ok && response.type === 'basic') {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			const cached = await cache.match(event.request);
			if (cached) return cached;
			// Navigation offline → SPA-Shell ausliefern (Client-Routing übernimmt).
			if (event.request.mode === 'navigate') {
				const shell = (await cache.match(FALLBACK)) ?? (await cache.match(`${base}/`));
				if (shell) return shell;
			}
			return new Response('Offline und nicht im Cache.', {
				status: 503,
				headers: { 'content-type': 'text/plain; charset=utf-8' }
			});
		}
	}

	event.respondWith(respond());
});
