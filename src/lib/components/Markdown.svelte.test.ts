// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Markdown from './Markdown.svelte';

afterEach(() => cleanup());

describe('Markdown', () => {
	it('rendert einen Codeblock mit Kopieren-Button', () => {
		render(Markdown, { props: { source: '```\nconst a = 1;\n```' } });
		expect(screen.getByText('const a = 1;')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Kopieren' })).toBeInTheDocument();
	});

	it('rendert fetten Text als <strong>', () => {
		render(Markdown, { props: { source: '**wichtig**' } });
		expect(screen.getByText('wichtig').tagName).toBe('STRONG');
	});
});
