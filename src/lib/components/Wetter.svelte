<script lang="ts">
	import { wmoToWetter } from '$lib/weather';
	import Icon from './Icon.svelte';

	// Kompaktes Wetter fürs „Heute"-Kopffeld: aktuelles Wetter + Temperatur,
	// dazu Tages-Höchst/-Tiefst. Standort per Browser-Geolocation, Daten von
	// Open-Meteo (kein API-Key). Bei Ablehnung/Fehler/ohne Support: nichts zeigen.
	type Wetterdaten = { temp: number; max: number; min: number; code: number };
	let zustand = $state<'laden' | 'ok' | 'aus'>('laden');
	let daten = $state<Wetterdaten | null>(null);

	$effect(() => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			zustand = 'aus';
			return;
		}
		let abgebrochen = false;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const { latitude, longitude } = pos.coords;
					const url =
						`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
						`&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
						`&timezone=auto&forecast_days=1`;
					const res = await fetch(url);
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const j = await res.json();
					if (abgebrochen) return;
					daten = {
						temp: Math.round(j.current.temperature_2m),
						code: j.current.weather_code,
						max: Math.round(j.daily.temperature_2m_max[0]),
						min: Math.round(j.daily.temperature_2m_min[0])
					};
					zustand = 'ok';
				} catch {
					if (!abgebrochen) zustand = 'aus';
				}
			},
			() => {
				if (!abgebrochen) zustand = 'aus'; // Ablehnung oder Fehler → ausblenden
			},
			{ timeout: 10_000, maximumAge: 900_000 }
		);
		return () => {
			abgebrochen = true;
		};
	});

	const w = $derived(daten ? wmoToWetter(daten.code) : null);
</script>

{#if zustand === 'laden'}
	<p class="mt-1 text-xs text-zinc-600">Wetter …</p>
{:else if zustand === 'ok' && daten && w}
	<div class="mt-1 flex items-center justify-end gap-1.5 text-sm text-zinc-300">
		<Icon name={w.icon} class="h-4 w-4 text-zinc-400" />
		<span class="font-semibold text-zinc-100">{daten.temp}°</span>
		<span class="text-xs text-zinc-500">{w.text}</span>
		<span class="text-xs text-zinc-500">↑{daten.max}° ↓{daten.min}°</span>
	</div>
{/if}
