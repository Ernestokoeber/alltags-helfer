import { describe, expect, it } from 'vitest';
import { deriveKey, encryptJson, decryptJson, randomSaltB64 } from './crypto';

describe('crypto (E2EE)', () => {
	it('verschlüsselt und entschlüsselt ein Objekt verlustfrei', async () => {
		const key = await deriveKey('geheim123', randomSaltB64());
		const obj = { id: 'a', content: 'Hallo Welt', n: 42, tags: ['x', 'y'] };
		const blob = await encryptJson(key, obj);
		expect(typeof blob).toBe('string');
		expect(blob).not.toContain('Hallo'); // Klartext darf nicht im Chiffrat stehen
		expect(await decryptJson(key, blob)).toEqual(obj);
	});

	it('scheitert bei falschem Passwort (GCM-Authentifizierung)', async () => {
		const salt = randomSaltB64();
		const k1 = await deriveKey('richtig', salt);
		const k2 = await deriveKey('falsch', salt);
		const blob = await encryptJson(k1, { a: 1 });
		await expect(decryptJson(k2, blob)).rejects.toBeTruthy();
	});

	it('erzeugt durch zufälligen IV unterschiedliches Chiffrat für gleiche Daten', async () => {
		const key = await deriveKey('pw', randomSaltB64());
		const a = await encryptJson(key, { x: 1 });
		const b = await encryptJson(key, { x: 1 });
		expect(a).not.toBe(b);
		expect(await decryptJson(key, a)).toEqual(await decryptJson(key, b));
	});

	it('randomSaltB64 variiert', () => {
		expect(randomSaltB64()).not.toBe(randomSaltB64());
	});
});
