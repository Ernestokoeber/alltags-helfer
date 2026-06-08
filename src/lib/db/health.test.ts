import { describe, expect, it } from 'vitest';
import { persistStorage, probeIndexedDB } from './health';

describe('persistStorage', () => {
	it('false, wenn keine Storage-API vorhanden', async () => {
		expect(await persistStorage(undefined)).toBe(false);
	});

	it('true, wenn bereits persistent (kein erneutes persist nötig)', async () => {
		const storage = {
			persisted: async () => true,
			persist: async () => false
		} as unknown as StorageManager;
		expect(await persistStorage(storage)).toBe(true);
	});

	it('fordert persist an, wenn noch nicht persistent', async () => {
		const storage = {
			persisted: async () => false,
			persist: async () => true
		} as unknown as StorageManager;
		expect(await persistStorage(storage)).toBe(true);
	});
});

describe('probeIndexedDB', () => {
	it('true bei nutzbarer IndexedDB (fake-indexeddb)', async () => {
		expect(await probeIndexedDB()).toBe(true);
	});

	it('false, wenn IndexedDB fehlt', async () => {
		// Hinweis: explizit übergebenes `undefined` würde den Default reaktivieren,
		// daher `null` — derselbe Guard-Zweig wie ein fehlendes globalThis.indexedDB.
		expect(await probeIndexedDB(null as unknown as IDBFactory)).toBe(false);
	});

	it('false, wenn open() wirft (z. B. privater Modus)', async () => {
		const broken = {
			open() {
				throw new Error('blocked');
			}
		} as unknown as IDBFactory;
		expect(await probeIndexedDB(broken)).toBe(false);
	});
});
