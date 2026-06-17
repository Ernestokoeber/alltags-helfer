// Cloudflare Worker: Geräte-Sync-API für den Alltags-Helfer.
//
// Speichert pro Datensatz nur ein opakes (Ende-zu-Ende-verschlüsseltes) Blob plus
// Sync-Metadaten in D1. Ein Endpoint `POST /sync` macht Pull + Push (Last-Write-Wins)
// in einem Round-Trip. Der Worker kennt weder Klartext noch Schlüssel — die
// Verschlüsselung passiert ausschließlich im Client.

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
}
interface Env {
	DB: D1Database;
	SYNC_SECRET: string;
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

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const cors = corsHeaders(req.headers.get('Origin'));

		// CORS-Preflight.
		if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

		const url = new URL(req.url);
		if (url.pathname === '/' || url.pathname === '/health') {
			return json({ ok: true }, 200, cors);
		}
		if (req.method !== 'POST' || url.pathname !== '/sync') {
			return json({ error: 'not found' }, 404, cors);
		}

		// Authentifizierung: Bearer-Token muss dem Worker-Secret entsprechen.
		const auth = req.headers.get('Authorization') ?? '';
		const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
		if (!env.SYNC_SECRET || !sicherGleich(token, env.SYNC_SECRET)) {
			return json({ error: 'unauthorized' }, 401, cors);
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
	}
};
