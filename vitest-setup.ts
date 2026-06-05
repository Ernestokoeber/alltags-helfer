// In-Memory-IndexedDB, damit Dexie in den Tests ohne echten Browser läuft.
import 'fake-indexeddb/auto';
// DOM-Matcher (toBeInTheDocument usw.) für die Komponententests.
import '@testing-library/jest-dom/vitest';
