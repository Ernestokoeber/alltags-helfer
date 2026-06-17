// Minimaler, XSS-sicherer Markdown-Parser für Notizen. Bewusst kein volles
// CommonMark — deckt Codeblöcke, Inline-Code, Überschriften, Listen, fett/kursiv
// und Links ab. Prinzip: Inhalt wird zuerst escaped, danach werden nur eigene,
// bekannte Tags erzeugt (Link-URLs auf http(s)/mailto begrenzt). Damit kann aus
// Nutzertext kein aktiver Code entstehen.

export type Block =
	| { type: 'code'; lang: string; content: string }
	| { type: 'heading'; level: 1 | 2 | 3; html: string }
	| { type: 'ul'; items: string[] }
	| { type: 'ol'; items: string[] }
	| { type: 'hr' }
	| { type: 'p'; html: string };

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// Nur sichere Schemata zulassen — sonst kein Link.
function safeUrl(url: string): string | null {
	const u = url.trim();
	return /^https?:\/\//i.test(u) || /^mailto:/i.test(u) ? u : null;
}

// Formatierung für reinen Text (bereits ohne Inline-Code). Reihenfolge: escapen,
// dann Links/fett/kursiv über dem escapten Text (die Captures sind also safe).
function formatText(text: string): string {
	let s = escapeHtml(text);
	s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
		const safe = safeUrl(url);
		return safe
			? `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-teal-300 underline">${label}</a>`
			: m;
	});
	s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
	s = s.replace(/(^|[^_])_([^_\s][^_]*)_/g, '$1<em>$2</em>');
	return s;
}

// Inline-HTML (sicher): auf Backticks splitten — ungerade Teile = Inline-Code.
export function inlineHtml(text: string): string {
	const parts = text.split('`');
	let out = '';
	for (let i = 0; i < parts.length; i++) {
		out +=
			i % 2 === 1
				? `<code class="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">${escapeHtml(parts[i])}</code>`
				: formatText(parts[i]);
	}
	return out;
}

export function parseMarkdown(src: string): Block[] {
	const lines = src.replace(/\r\n?/g, '\n').split('\n');
	const blocks: Block[] = [];
	let i = 0;
	let para: string[] = [];

	const flushPara = () => {
		if (para.length) {
			blocks.push({ type: 'p', html: para.map(inlineHtml).join('<br>') });
			para = [];
		}
	};

	while (i < lines.length) {
		const line = lines[i];

		// Codeblock ```lang … ```
		const fence = line.match(/^```(.*)$/);
		if (fence) {
			flushPara();
			const lang = fence[1].trim();
			const body: string[] = [];
			i++;
			while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
			i++; // schließende Fence (oder EOF)
			blocks.push({ type: 'code', lang, content: body.join('\n') });
			continue;
		}

		if (line.trim() === '') {
			flushPara();
			i++;
			continue;
		}

		const h = line.match(/^(#{1,3})\s+(.*)$/);
		if (h) {
			flushPara();
			blocks.push({ type: 'heading', level: h[1].length as 1 | 2 | 3, html: inlineHtml(h[2]) });
			i++;
			continue;
		}

		if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
			flushPara();
			blocks.push({ type: 'hr' });
			i++;
			continue;
		}

		if (/^\s*[-*]\s+/.test(line)) {
			flushPara();
			const items: string[] = [];
			while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
				items.push(inlineHtml(lines[i].replace(/^\s*[-*]\s+/, '')));
				i++;
			}
			blocks.push({ type: 'ul', items });
			continue;
		}

		if (/^\s*\d+\.\s+/.test(line)) {
			flushPara();
			const items: string[] = [];
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				items.push(inlineHtml(lines[i].replace(/^\s*\d+\.\s+/, '')));
				i++;
			}
			blocks.push({ type: 'ol', items });
			continue;
		}

		para.push(line);
		i++;
	}
	flushPara();
	return blocks;
}
