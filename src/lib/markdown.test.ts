import { describe, expect, it } from 'vitest';
import { parseMarkdown, inlineHtml } from './markdown';

describe('parseMarkdown', () => {
	it('erkennt einen Codeblock mit Sprache (Inhalt unverändert)', () => {
		const blocks = parseMarkdown('```js\nconst a = 1;\n<b>\n```');
		expect(blocks).toEqual([{ type: 'code', lang: 'js', content: 'const a = 1;\n<b>' }]);
	});

	it('erkennt Überschriften, Listen und Absätze', () => {
		const blocks = parseMarkdown('# Titel\n\n- a\n- b\n\nText');
		expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
		expect(blocks[1]).toMatchObject({ type: 'ul', items: ['a', 'b'] });
		expect(blocks[2]).toMatchObject({ type: 'p' });
	});

	it('nummerierte Liste', () => {
		const blocks = parseMarkdown('1. eins\n2. zwei');
		expect(blocks[0]).toMatchObject({ type: 'ol', items: ['eins', 'zwei'] });
	});
});

describe('inlineHtml (XSS-sicher)', () => {
	it('escapt HTML und erzeugt keine aktiven Tags', () => {
		expect(inlineHtml('<script>alert(1)</script>')).toBe(
			'&lt;script&gt;alert(1)&lt;/script&gt;'
		);
	});

	it('rendert fett, kursiv und Inline-Code', () => {
		expect(inlineHtml('**fett** und *kursiv*')).toBe('<strong>fett</strong> und <em>kursiv</em>');
		expect(inlineHtml('Code `x<y`')).toContain('<code');
		expect(inlineHtml('Code `x<y`')).toContain('x&lt;y'); // im Code escaped
	});

	it('erlaubt nur sichere Link-URLs', () => {
		expect(inlineHtml('[ok](https://example.com)')).toContain('<a href="https://example.com"');
		expect(inlineHtml('[bose](javascript:alert(1))')).not.toContain('<a ');
	});
});
