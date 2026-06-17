// Ende-zu-Ende-Verschlüsselung für den Geräte-Sync.
//
// Schlüssel aus Passwort + Salt via PBKDF2 (Web Crypto, keine externe Lib),
// Inhalte mit AES-GCM (zufälliger IV je Verschlüsselung). Der Schlüssel verlässt
// das Gerät nie — der Server speichert ausschließlich Chiffrat.

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITER = 310_000; // bewusst hoch → teures Offline-Brute-Forcing

function bytesToB64(b: Uint8Array): string {
	let s = '';
	for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
	return btoa(s);
}

// Rückgabe explizit ArrayBuffer-gestützt: Web-Crypto erwartet eine BufferSource
// über echtem ArrayBuffer (TS-6-lib unterscheidet das vom generischen ArrayBufferLike).
function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

// Zufälliges Salt (16 Byte) als Base64 — nicht geheim, wird zwischen den Geräten
// geteilt, damit beide aus demselben Passwort denselben Schlüssel ableiten.
export function randomSaltB64(): string {
	return bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
}

// AES-GCM-256-Schlüssel aus Passwort + Salt ableiten (langsam per PBKDF2).
export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
		'deriveKey'
	]);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITER, hash: 'SHA-256' },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

// Objekt → JSON → AES-GCM → Base64(IV ‖ Chiffrat).
export async function encryptJson(key: CryptoKey, obj: unknown): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)))
	);
	const out = new Uint8Array(iv.length + ct.length);
	out.set(iv, 0);
	out.set(ct, iv.length);
	return bytesToB64(out);
}

// Umkehrung. Wirft bei falschem Schlüssel oder manipuliertem Chiffrat
// (AES-GCM prüft die Authentizität).
export async function decryptJson(key: CryptoKey, blob: string): Promise<unknown> {
	const buf = b64ToBytes(blob);
	const iv = buf.slice(0, 12);
	const ct = buf.slice(12);
	const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
	return JSON.parse(dec.decode(pt));
}
