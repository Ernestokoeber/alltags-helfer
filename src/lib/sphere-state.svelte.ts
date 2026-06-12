import type { Sphere } from './sphere';

// Globaler Sphären-Zustand (Svelte-5-Rune), in localStorage gemerkt, damit die
// gewählte Sicht App-Start und Tab-Wechsel überlebt. Bewusst ohne $app-Imports,
// damit Seiten mit dieser Abhängigkeit auch unter Vitest laufen.
const KEY = 'alltags-helfer:sphaere';

function initial(): Sphere {
	try {
		const v = globalThis.localStorage?.getItem(KEY);
		if (v === 'privat' || v === 'geschaeftlich' || v === 'alles') return v;
	} catch {
		// localStorage blockiert (z. B. privater Modus) → Standardwert.
	}
	return 'alles';
}

class SphereState {
	current = $state<Sphere>(initial());

	set(s: Sphere) {
		this.current = s;
		try {
			globalThis.localStorage?.setItem(KEY, s);
		} catch {
			// Nicht speicherbar → Auswahl gilt nur für diese Sitzung.
		}
	}
}

export const sphaere = new SphereState();
