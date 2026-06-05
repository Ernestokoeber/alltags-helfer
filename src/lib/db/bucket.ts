import { db, uuid } from './db';
import type { BucketItem, Category } from './types';

export async function addBucketItem(input: {
	title: string;
	description?: string;
	targetDate?: number;
	category?: Category;
}): Promise<BucketItem> {
	const now = Date.now();
	const item: BucketItem = {
		id: uuid(),
		title: input.title.trim(),
		description: input.description?.trim() || undefined,
		targetDate: input.targetDate,
		done: false,
		category: input.category ?? 'offen',
		createdAt: now,
		updatedAt: now,
		deletedAt: null
	};
	await db.bucketItems.add(item);
	return item;
}

// Aktive Einträge: offene zuerst, dann erledigte; innerhalb neueste zuerst.
export async function allBucketItems(): Promise<BucketItem[]> {
	const arr = await db.bucketItems.toArray();
	return arr
		.filter((b) => b.deletedAt === null)
		.sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
}

export async function toggleBucketDone(id: string, done: boolean): Promise<void> {
	await db.bucketItems.update(id, { done, updatedAt: Date.now() });
}

export async function deleteBucketItem(id: string): Promise<void> {
	const now = Date.now();
	await db.bucketItems.update(id, { deletedAt: now, updatedAt: now });
}
