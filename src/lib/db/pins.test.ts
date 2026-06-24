import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addPin, pinsForScope, updatePin, deletePin } from './pins';

beforeEach(async () => {
	await db.pins.clear();
});

describe('Anheft-Bereich (Pins)', () => {
	it('addPin: trimmt Inhalt; leer → null', async () => {
		expect(await addPin('arbeit', '   ')).toBeNull();
		const p = await addPin('arbeit', '  Schritt 1\nSchritt 2  ');
		expect(p?.content).toBe('Schritt 1\nSchritt 2');
		expect(p?.scope).toBe('arbeit');
		expect(p?.deletedAt).toBeNull();
	});

	it('pinsForScope: nur aktiver Scope, älteste zuerst', async () => {
		const a = await addPin('arbeit', 'A');
		// künstlich älter machen, damit die Sortierung deterministisch ist
		await db.pins.update(a!.id, { createdAt: a!.createdAt - 1000 });
		await addPin('arbeit', 'B');
		await addPin('privat', 'X'); // anderer Scope → nicht enthalten

		const reihenfolge = (await pinsForScope('arbeit')).map((p) => p.content);
		expect(reihenfolge).toEqual(['A', 'B']);
	});

	it('updatePin: ändert Inhalt; leerer Inhalt wird ignoriert', async () => {
		const p = await addPin('arbeit', 'alt');
		await updatePin(p!.id, '  neu  ');
		expect((await db.pins.get(p!.id))?.content).toBe('neu');

		await updatePin(p!.id, '   ');
		expect((await db.pins.get(p!.id))?.content).toBe('neu');
	});

	it('deletePin: soft-delete (Tombstone, aus Liste raus)', async () => {
		const p = await addPin('arbeit', 'weg damit');
		await deletePin(p!.id);
		expect((await pinsForScope('arbeit')).length).toBe(0);
		expect((await db.pins.get(p!.id))?.deletedAt).not.toBeNull();
	});
});
