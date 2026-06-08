// Generiert die PWA-Platzhalter-Icons dependency-frei (nur Node-Builtins).
// Motiv: Teal-Kachel mit einer Sonne (passt zu ☀️ / "Heute").
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
const BG = [15, 118, 110]; // teal-700 #0f766e
const SUN = [251, 191, 36]; // amber-400 #fbbf24

function distSeg(px, py, ax, ay, bx, by) {
	const dx = bx - ax;
	const dy = by - ay;
	const l2 = dx * dx + dy * dy;
	let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Farbe an Fließkomma-Koordinate; alpha 0 = transparent (außerhalb der Kachel).
function colorAt(fx, fy, size, rounded) {
	const c = size / 2;
	if (rounded) {
		const r = 0.18 * size;
		const dx = Math.max(Math.abs(fx - c) - (c - r), 0);
		const dy = Math.max(Math.abs(fy - c) - (c - r), 0);
		if (Math.hypot(dx, dy) > r) return null; // außerhalb der abgerundeten Kachel
	}
	const dCenter = Math.hypot(fx - c, fy - c);
	let sun = dCenter <= 0.16 * size;
	if (!sun) {
		for (let i = 0; i < 8; i++) {
			const a = (i * Math.PI) / 4;
			const ax = c + Math.cos(a) * 0.22 * size;
			const ay = c + Math.sin(a) * 0.22 * size;
			const bx = c + Math.cos(a) * 0.34 * size;
			const by = c + Math.sin(a) * 0.34 * size;
			if (distSeg(fx, fy, ax, ay, bx, by) <= 0.035 * size) {
				sun = true;
				break;
			}
		}
	}
	return sun ? SUN : BG;
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
