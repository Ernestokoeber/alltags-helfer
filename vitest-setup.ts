// Stellt eine In-Memory-IndexedDB bereit, damit Dexie in Node-Tests läuft
// (ohne echten Browser). Muss vor den DB-Zugriffen geladen sein.
import 'fake-indexeddb/auto';
