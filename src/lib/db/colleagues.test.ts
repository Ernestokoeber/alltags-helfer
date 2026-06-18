import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
	seedColleaguesIfNew,
	addColleague,
	allColleagues,
	deleteColleague,
	addColleagueNote,
	allColleagueNotes,
	setColleagueNoteDone,
	deleteColleagueNote
} from './colleagues';

beforeEach(async () => {
	await db.colleagues.clear();
	await db.colleagueNotes.clear();
});

describe('Kollegen', () => {
	it('seedColleaguesIfNew: legt das Team an, idempotent', async () => {
		await seedColleaguesIfNew();
		await seedColleaguesIfNew(); // zweiter Lauf darf nichts doppeln
		expect((await allColleagues()).map((k) => k.name)).toEqual(['Nepomuk', 'Patrice', 'Tim']);
	});

	it('seedColleaguesIfNew: gelöschten Seed nicht wiederbeleben', async () => {
		await seedColleaguesIfNew();
		await deleteColleague('seed-tim');
		await seedColleaguesIfNew();
		expect((await allColleagues()).map((k) => k.name)).not.toContain('Tim');
	});

	it('addColleague: trimmt, weist Leeres ab', async () => {
		expect(await addColleague('   ')).toBeNull();
		const c = await addColleague('  Anna ');
		expect(c?.name).toBe('Anna');
		expect((await allColleagues()).map((k) => k.name)).toContain('Anna');
	});

	it('deleteColleague: soft-delete', async () => {
		const c = await addColleague('Bob');
		await deleteColleague(c!.id);
		expect((await allColleagues()).some((k) => k.id === c!.id)).toBe(false);
	});
});

describe('Kollegen-Notizen', () => {
	it('addColleagueNote: braucht Empfänger + Text, trimmt', async () => {
		expect(await addColleagueNote({ colleagueId: '', content: 'x' })).toBeNull();
		expect(await addColleagueNote({ colleagueId: 'k1', content: '  ' })).toBeNull();
		const n = await addColleagueNote({ colleagueId: 'k1', content: ' Hallo ' });
		expect(n?.content).toBe('Hallo');
		expect(n?.done).toBe(false);
	});

	it('allColleagueNotes: offene vor erledigten', async () => {
		const a = await addColleagueNote({ colleagueId: 'k1', content: 'a' });
		await addColleagueNote({ colleagueId: 'k1', content: 'b' });
		await setColleagueNoteDone(a!.id, true);
		const reihenfolge = (await allColleagueNotes()).map((n) => n.content);
		expect(reihenfolge[0]).toBe('b'); // offen zuerst
		expect(reihenfolge[reihenfolge.length - 1]).toBe('a'); // erledigt zuletzt
	});

	it('deleteColleagueNote: soft-delete', async () => {
		const n = await addColleagueNote({ colleagueId: 'k1', content: 'weg' });
		await deleteColleagueNote(n!.id);
		expect((await allColleagueNotes()).length).toBe(0);
	});
});
