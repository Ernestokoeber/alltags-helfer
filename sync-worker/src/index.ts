// Cloudflare Worker: Geräte-Sync-API + generische Push-Erinnerungen für den Alltags-Helfer.
//
// Sync speichert pro Datensatz nur ein opakes (Ende-zu-Ende-verschlüsseltes) Blob plus
// Sync-Metadaten in D1. `POST /sync` macht Pull + Push (Last-Write-Wins) in einem Round-Trip.
// Push speichert nur Abo-Endpoints und Erinnerungs-ZEITEN (kein Inhalt!) — ein Cron schickt
// bei Fälligkeit eine *generische* Benachrichtigung. Der Worker kennt nie Klartext/Schlüssel.

// Minimale D1-Typen statt @cloudflare/workers-types (hält den Worker dependency-frei).
interface D1Result<T> {
	results: T[];
}
interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
	run(): Promise<unknown>;
}
interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch(statements: D1PreparedStatement[]): Promise<unknown>;
}
interface Env {
	DB: D1Database;
	SYNC_SECRET: string;
	VAPID_PUBLIC: string; // öffentlicher VAPID-Key (auch im Client)
	VAPID_SUBJECT: string; // mailto:… Kontakt für Push-Dienste
	VAPID_PRIVATE_JWK: string; // privater Key als JWK-JSON (Secret)
}

type Change = {
	id: string;
	collection: string;
	data: string;
	updatedAt: number;
	deleted?: boolean;
};

// Erlaubte Origins: App auf GitHub Pages + lokale Entwicklung.
const ALLOWED_ORIGINS = new Set([
	'https://ernestokoeber.github.io',
	'http://localhost:5173',
	'http://localhost:4173'
]);

function corsHeaders(origin: string | null): Record<string, string> {
	const allow =
		origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://ernestokoeber.github.io';
	return {
		'Access-Control-Allow-Origin': allow,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin'
	};
}

// Konstantzeitiger Vergleich, damit das Token nicht über die Antwortzeit erratbar wird.
function sicherGleich(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...cors }
	});
}

// --- VAPID / Web-Push (payload-los, RFC 8292) ---
function b64urlFromString(s: string): string {
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlFromBytes(bytes: Uint8Array): string {
	let s = '';
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Baut den VAPID-Authorization-Header (signiertes JWT, ES256) für einen Push-Dienst.
async function vapidAuthHeader(aud: string, env: Env): Promise<string> {
	const header = b64urlFromString(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
	const payload = b64urlFromString(
		JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })
	);
	const signingInput = `${header}.${payload}`;
	const key = await crypto.subtle.importKey(
		'jwk',
		JSON.parse(env.VAPID_PRIVATE_JWK),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
	const sig = new Uint8Array(
		await crypto.subtle.sign(
			{ name: 'ECDSA', hash: 'SHA-256' },
			key,
			new TextEncoder().encode(signingInput)
		)
	);
	return `vapid t=${signingInput}.${b64urlFromBytes(sig)}, k=${env.VAPID_PUBLIC}`;
}

// Sendet eine payload-lose Push an einen Endpoint und liefert den HTTP-Status.
async function sendPush(endpoint: string, env: Env): Promise<number> {
	const aud = new URL(endpoint).origin;
	const auth = await vapidAuthHeader(aud, env);
	const res = await fetch(endpoint, { method: 'POST', headers: { Authorization: auth, TTL: '86400' } });
	return res.status;
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const cors = corsHeaders(req.headers.get('Origin'));

		// CORS-Preflight.
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

		const url = new URL(req.url);
		if (url.pathname === '/' || url.pathname === '/health') {
			return json({ ok: true }, 200, cors);
		}

		// Authentifizierung: Bearer-Token muss dem Worker-Secret entsprechen (alle Endpoints).
		const auth = req.headers.get('Authorization') ?? '';
		const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
		if (!env.SYNC_SECRET || !sicherGleich(token, env.SYNC_SECRET)) {
			return json({ error: 'unauthorized' }, 401, cors);
		}

		// --- Push-Abo registrieren (nur Endpoint, kein Inhalt) ---
		if (req.method === 'POST' && url.pathname === '/push/subscribe') {
			let b: { endpoint?: string };
			try {
				b = (await req.json()) as { endpoint?: string };
			} catch {
				return json({ error: 'bad json' }, 400, cors);
			}
			if (!b.endpoint || typeof b.endpoint !== 'string') {
				return json({ error: 'no endpoint' }, 400, cors);
			}
			await env.DB.prepare(
				'INSERT INTO push_subs (endpoint, created_at) VALUES (?, ?) ON CONFLICT(endpoint) DO NOTHING'
			)
				.bind(b.endpoint, Date.now())
				.run();
			return json({ ok: true }, 200, cors);
		}

		// --- Erinnerungs-Zeitplan ersetzen (nur Zeiten, kein Inhalt) ---
		if (req.method === 'POST' && url.pathname === '/push/reminders') {
			let b: { times?: number[] };
			try {
				b = (await req.json()) as { times?: number[] };
			} catch {
				return json({ error: 'bad json' }, 400, cors);
			}
			const times = Array.isArray(b.times)
				? b.times.filter((t) => Number.isFinite(t)).slice(0, 1000)
				: [];
			const stmts: D1PreparedStatement[] = [env.DB.prepare('DELETE FROM reminders')];
			for (const t of times) {
				stmts.push(env.DB.prepare('INSERT INTO reminders (at) VALUES (?)').bind(Number(t)));
			}
			await env.DB.batch(stmts);
			return json({ ok: true, count: times.length }, 200, cors);
		}

		if (req.method !== 'POST' || url.pathname !== '/sync') {
			return json({ error: 'not found' }, 404, cors);
		}

		let body: { since?: number; changes?: Change[] };
		try {
			body = (await req.json()) as { since?: number; changes?: Change[] };
		} catch {
			return json({ error: 'bad json' }, 400, cors);
		}
		const since = Number.isFinite(body.since) ? Number(body.since) : 0;
		const changes = Array.isArray(body.changes) ? body.changes : [];

		// 1) Pull (vor dem Anwenden): alles, was der Client seit seinem Cursor noch
		//    nicht kennt. Schließt die gleich folgenden eigenen Pushes bewusst aus.
		const deltas = (
			await env.DB.prepare(
				'SELECT id, collection, data, updated_at AS updatedAt, deleted FROM records WHERE seq > ? ORDER BY seq'
			)
				.bind(since)
				.all<{
					id: string;
					collection: string;
					data: string;
					updatedAt: number;
					deleted: number;
				}>()
		).results;

		// 2) Push: eingehende Änderungen per Last-Write-Wins anwenden.
		const maxRow = await env.DB.prepare('SELECT IFNULL(MAX(seq), 0) AS m FROM records').first<{
			m: number;
		}>();
		let seq = maxRow?.m ?? 0;
		for (const ch of changes) {
			if (!ch || typeof ch.id !== 'string' || typeof ch.updatedAt !== 'number') continue;
			const ex = await env.DB.prepare('SELECT updated_at AS u FROM records WHERE id = ?')
				.bind(ch.id)
				.first<{ u: number }>();
			if (ex && ch.updatedAt <= ex.u) continue; // vorhandene Version ist neuer → behalten
			seq++;
			await env.DB.prepare(
				`INSERT INTO records (id, collection, data, updated_at, deleted, seq)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(id) DO UPDATE SET
				   collection = excluded.collection,
				   data = excluded.data,
				   updated_at = excluded.updated_at,
				   deleted = excluded.deleted,
				   seq = excluded.seq`
			)
				.bind(ch.id, ch.collection, ch.data, ch.updatedAt, ch.deleted ? 1 : 0, seq)
				.run();
		}

		// 3) Neuer Cursor = höchste seq nach dem Anwenden (deckt auch die eigenen Pushes ab).
		return json(
			{
				cursor: seq,
				changes: deltas.map((r) => ({
					id: r.id,
					collection: r.collection,
					data: r.data,
					updatedAt: r.updatedAt,
					deleted: r.deleted === 1
				}))
			},
			200,
			cors
		);
	},

	// Cron-Trigger: fällige Erinnerungen seit dem letzten Lauf → eine generische Push.
	async scheduled(_event: unknown, env: Env): Promise<void> {
		const now = Date.now();
		const stateRow = await env.DB.prepare("SELECT v FROM push_state WHERE k = 'last_run'").first<{
			v: string;
		}>();
		const lastRun = stateRow ? Number(stateRow.v) : now - 16 * 60 * 1000;

		const dueRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM reminders WHERE at > ? AND at <= ?')
			.bind(lastRun, now)
			.first<{ n: number }>();

		if ((dueRow?.n ?? 0) > 0) {
			const subs = (
				await env.DB.prepare('SELECT endpoint FROM push_subs').all<{ endpoint: string }>()
			).results;
			for (const s of subs) {
				try {
					const status = await sendPush(s.endpoint, env);
					// 404/410 = Abo abgelaufen/entfernt → aufräumen.
					if (status === 404 || status === 410) {
						await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(s.endpoint).run();
					}
				} catch {
					/* einzelnes Abo-Versagen ignorieren, andere weiter bedienen */
				}
			}
		}

		await env.DB.prepare(
			"INSERT INTO push_state (k, v) VALUES ('last_run', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v"
		)
			.bind(String(now))
			.run();
	}
};
