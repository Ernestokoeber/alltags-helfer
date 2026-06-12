// Reine Client-PWA: kein Server-Side-Rendering — die Daten liegen lokal im
// Browser (IndexedDB/Dexie), der Client rendert alles selbst. Die Routen werden
// aber als leere Shells prerendert (index.html, notizen.html, …), damit
// statische Hosts wie GitHub Pages echte Dateien mit Status 200 ausliefern
// (wichtig für PWA-Installierbarkeit); 404.html bleibt Fallback für den Rest.
export const ssr = false;
export const prerender = true;
