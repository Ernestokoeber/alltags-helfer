import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addSupportCase, allSupportCases, updateSupportCase, deleteSupportCase } from './support';

beforeEach(async () => {
	await db.supportCases.clear();
});

describe('Kundensupport', () => {
	it('addSupportCase: braucht Kunde + Problem; ohne Lösung = offen', async () => {
		expect(await addSupportCase({ customer: '', problem: 'x' })).toBeNull();
		expect(await addSupportCase({ customer: 'K', problem: '  ' })).toBeNull();
		const f = await addSupportCase({ customer: ' Müller GmbH ', problem: ' Drucker streikt ' });
		expect(f?.customer).toBe('Müller GmbH');
		expect(f?.problem).toBe('Drucker streikt');
		expect(f?.status).toBe('offen');
		expect(f?.solution).toBeUndefined();
	});

	it('addSupportCase: mit Lösung direkt gelöst', async () => {
		const f = await addSupportCase({ customer: 'K', problem: 'P', solution: 'Neugestartet' });
		expect(f?.status).toBe('geloest');
		expect(f?.resolvedAt).not.toBeNull();
	});

	it('updateSupportCase: Lösung nachtragen → gelöst; leeren → wieder offen', async () => {
		const f = await addSupportCase({ customer: 'K', problem: 'P' });
		await updateSupportCase(f!.id, { solution: 'Kabel getauscht' });
		let g = await db.supportCases.get(f!.id);
		expect(g?.status).toBe('geloest');
		expect(g?.solution).toBe('Kabel getauscht');

		await updateSupportCase(f!.id, { solution: '' });
		g = await db.supportCases.get(f!.id);
		expect(g?.status).toBe('offen');
		expect(g?.solution).toBeUndefined();
	});

	it('allSupportCases: offene vor gelösten', async () => {
		await addSupportCase({ customer: 'A', problem: 'P', solution: 'fertig' }); // gelöst
		await addSupportCase({ customer: 'B', problem: 'P' }); // offen
		const reihenfolge = (await allSupportCases()).map((f) => f.customer);
		expect(reihenfolge[0]).toBe('B');
		expect(reihenfolge[reihenfolge.length - 1]).toBe('A');
	});

	it('deleteSupportCase: soft-delete', async () => {
		const f = await addSupportCase({ customer: 'K', problem: 'P' });
		await deleteSupportCase(f!.id);
		expect((await allSupportCases()).length).toBe(0);
	});
});
