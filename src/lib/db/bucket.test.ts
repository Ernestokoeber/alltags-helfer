import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addBucketItem, allBucketItems, toggleBucketDone, deleteBucketItem } from './bucket';

beforeEach(async () => {
	await db.bucketItems.clear();
});

describe('Bucketlist', () => {
	it('addBucketItem: done=false als Standard', async () => {
		const b = await addBucketItem({ title: 'Fallschirmsprung' });
		expect(b.done).toBe(false);
		expect(b.title).toBe('Fallschirmsprung');
		expect(b.category).toBe('offen');
		expect(b.deletedAt).toBeNull();
	});

	it('addBucketItem: speichert Beschreibung, Zieldatum und Kategorie', async () => {
		const ziel = new Date(2026, 7, 15).getTime();
		const b = await addBucketItem({
			title: 'Island bereisen',
			description: 'Ringstraße mit dem Camper',
			targetDate: ziel,
			category: 'privat'
		});
		const gespeichert = await db.bucketItems.get(b.id);
		expect(gespeichert?.description).toBe('Ringstraße mit dem Camper');
		expect(gespeichert?.targetDate).toBe(ziel);
		expect(gespeichert?.category).toBe('privat');
	});

	it('toggleBucketDone setzt den Status', async () => {
		const b = await addBucketItem({ title: 'x' });
		await toggleBucketDone(b.id, true);
		expect((await db.bucketItems.get(b.id))?.done).toBe(true);
	});

	it('allBucketItems: offene zuerst, dann erledigte', async () => {
		const a = await addBucketItem({ title: 'a' });
		await addBucketItem({ title: 'b' });
		await toggleBucketDone(a.id, true); // a erledigt -> ans Ende

		const liste = await allBucketItems();
		expect(liste[0].title).toBe('b');
		expect(liste[liste.length - 1].title).toBe('a');
	});

	it('deleteBucketItem: Soft-Delete', async () => {
		const b = await addBucketItem({ title: 'weg' });
		await deleteBucketItem(b.id);
		expect((await db.bucketItems.get(b.id))?.deletedAt).not.toBeNull();
		expect((await allBucketItems()).length).toBe(0);
	});
});
