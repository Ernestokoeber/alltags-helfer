// Generiert die PWA-Platzhalter-Icons dependency-frei (nur Node-Builtins).
// Motiv: zwei überlappende Sphären (Amber = Privat, Himmelblau = Arbeit) auf dunkler Kachel.
// Erneut ausführen: `node scripts/gen-icons.mjs` — überschreibt static/icons/*.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'static', 'icons');

// --- Minimaler PNG-Encoder (RGBA, 8 Bit, color type 6) -----------------------
const crcTable = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length, 0);
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body), 0);
	return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
	const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // color type RGBA
	const stride = size * 4;
	const raw = Buffer.alloc((stride + 1) * size);
	for (let y = 0; y < size; y++) {
		raw[y * (stride + 1)] = 0; // Filter "none" pro Scanline
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
	}
	const idat = deflateSync(raw, { level: 9 });
	return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Zeichnen -----------------------------------------------------------------
// Motiv „Zwei Sphären": Amber (Privat) und Himmelblau (Arbeit) überlappen sich
// auf dunklem Grund — die Schnittmenge leuchtet hell (verknüpfte Lebensbereiche).
const BG = [9, 9, 11]; // zinc-950 #09090b
const PRIVAT = [251, 191, 36]; // amber-400 #fbbf24
const ARBEIT = [56, 189, 248]; // sky-400 #38bdf8
const SCHNITT = [244, 244, 245]; // zinc-100 #f4f4f5

function colorAt(fx, fy, size, rounded) {
	const c = size / 2;
	if (rounded) {
		const r = 0.18 * size;
		const dx = Math.max(Math.abs(fx - c) - (c - r), 0);
		const dy = Math.max(Math.abs(fy - c) - (c - r), 0);
		if (Math.hypot(dx, dy) > r) return null; // außerhalb der abgerundeten Kachel
	}
	const r = 0.21 * size;
	const inPrivat = Math.hypot(fx - 0.41 * size, fy - 0.43 * size) <= r;
	const inArbeit = Math.hypot(fx - 0.59 * size, fy - 0.57 * size) <= r;
	if (inPrivat && inArbeit) return SCHNITT;
	if (inPrivat) return PRIVAT;
	if (inArbeit) return ARBEIT;
	return BG;
}

// 2x2-Supersampling für glatte Kanten (korrekt über Deckung gemittelt).
function render(size, rounded) {
	const rgba = Buffer.alloc(size * size * 4);
	const SS = 2;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let r = 0;
			let g = 0;
			let b = 0;
			let cover = 0;
			for (let sy = 0; sy < SS; sy++) {
				for (let sx = 0; sx < SS; sx++) {
					const col = colorAt(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, rounded);
					if (col) {
						r += col[0];
						g += col[1];
						b += col[2];
						cover++;
					}
				}
			}
			const i = (y * size + x) * 4;
			const n = SS * SS;
			if (cover === 0) {
				rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
			} else {
				rgba[i] = Math.round(r / cover);
				rgba[i + 1] = Math.round(g / cover);
				rgba[i + 2] = Math.round(b / cover);
				rgba[i + 3] = Math.round((cover / n) * 255);
			}
		}
	}
	return rgba;
}

mkdirSync(outDir, { recursive: true });
const targets = [
	['icon-192.png', 192, true],
	['icon-512.png', 512, true],
	['icon-512-maskable.png', 512, false], // maskable: voll ausgefüllt, Motiv in der Safe-Zone
	['apple-touch-icon.png', 180, false] // iOS rundet selbst, daher voll ausgefüllt
];
for (const [name, size, rounded] of targets) {
	writeFileSync(join(outDir, name), encodePng(size, render(size, rounded)));
	console.log(`✓ ${name} (${size}px)`);
}
console.log('Icons generiert →', outDir);
