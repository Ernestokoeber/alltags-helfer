import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addPrepTask, prepTasksFor, togglePrepDone, deletePrepTask } from './prep';

beforeEach(async () => {
	await db.prepTasks.clear();
});

describe('Vorbereitungs-Tasks', () => {
	it('addPrepTask: legt eine Aufgabe für einen Termin an (done=false, getrimmt)', async () => {
		const t = await addPrepTask('appt-1', '  Unterlagen drucken  ');
		expect(t.appointmentId).toBe('appt-1');
		expect(t.title).toBe('Unterlagen drucken');
		expect(t.done).toBe(false);
		expect(t.deletedAt).toBeNull();
	});

	it('prepTasksFor: nur Aufgaben des Termins, älteste zuerst, ohne gelöschte', async () => {
		const a = await addPrepTask('appt-1', 'A');
		await addPrepTask('appt-2', 'fremd');
		await addPrepTask('appt-1', 'B');
		await db.prepTasks.update(a.id, { createdAt: Date.now() - 1000 });

		const liste = await prepTasksFor('appt-1');
		expect(liste.map((t) => t.title)).toEqual(['A', 'B']);
	});

	it('togglePrepDone setzt den Status', async () => {
		const t = await addPrepTask('appt-1', 'x');
		await togglePrepDone(t.id, true);
		expect((await db.prepTasks.get(t.id))?.done).toBe(true);
	});

	it('deletePrepTask: Soft-Delete entfernt aus der Liste', async () => {
		const t = await addPrepTask('appt-1', 'weg');
		await deletePrepTask(t.id);
		expect((await db.prepTasks.get(t.id))?.deletedAt).not.toBeNull();
		expect((await prepTasksFor('appt-1')).length).toBe(0);
	});
});
