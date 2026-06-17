import type { IconName } from '$lib/components/Icon.svelte';

// WMO-Wettercode (Open-Meteo) → Icon-Name + deutscher Kurztext.
// Reine Funktion (gut testbar). Codes gruppiert nach WMO-Tabelle:
// 0 klar … 45/48 Nebel … 51–67 Regen/Niesel … 71–86 Schnee … 95+ Gewitter.
export function wmoToWetter(code: number): { icon: IconName; text: string } {
	if (code === 0) return { icon: 'sun', text: 'Klar' };
	if (code === 1) return { icon: 'sun', text: 'Überwiegend klar' };
	if (code === 2) return { icon: 'cloud', text: 'Teils bewölkt' };
	if (code === 3) return { icon: 'cloud', text: 'Bedeckt' };
	if (code === 45 || code === 48) return { icon: 'fog', text: 'Nebel' };
	if (code >= 51 && code <= 57) return { icon: 'rain', text: 'Niesel' };
	if (code >= 61 && code <= 67) return { icon: 'rain', text: 'Regen' };
	if (code >= 71 && code <= 77) return { icon: 'snow', text: 'Schnee' };
	if (code >= 80 && code <= 82) return { icon: 'rain', text: 'Regenschauer' };
	if (code === 85 || code === 86) return { icon: 'snow', text: 'Schneeschauer' };
	if (code >= 95) return { icon: 'storm', text: 'Gewitter' };
	return { icon: 'cloud', text: 'Unbekannt' };
}
