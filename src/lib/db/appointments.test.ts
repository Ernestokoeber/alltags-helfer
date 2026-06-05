import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addAppointment, upcomingAppointments, deleteAppointment } from './appointments';

beforeEach(async () => {
	await db.appointments.clear();
});

describe('Termine', () => {
	it('addAppointment legt einen Termin an', async () => {
		const t = await addAppointment({
			title: 'Zahnarzt',
			startAt: Date.now() + 86_400_000,
			location: 'Praxis'
		});
		expect(t.id).toBeTruthy();
		expect(t.title).toBe('Zahnarzt');
		expect(t.location).toBe('Praxis');
		expect(t.deletedAt).toBeNull();
		expect(await db.appointments.get(t.id)).toBeDefined();
	});

	it('upcomingAppointments: nur zukünftige, aufsteigend, ohne gelöschte', async () => {
		const now = Date.now();
		const past = await addAppointment({ title: 'gestern', startAt: now - 86_400_000 });
		await addAppointment({ title: 'in 2 Tagen', startAt: now + 2 * 86_400_000 });
		await addAppointment({ title: 'morgen', startAt: now + 86_400_000 });

		const liste = await upcomingAppointments(now);
		expect(liste.map((t) => t.title)).toEqual(['morgen', 'in 2 Tagen']);
		expect(liste.find((t) => t.id === past.id)).toBeUndefined();
	});

	it('deleteAppointment: Soft-Delete entfernt aus der Liste', async () => {
		const now = Date.now();
		const t = await addAppointment({ title: 'weg', startAt: now + 86_400_000 });
		await deleteAppointment(t.id);
		expect((await db.appointments.get(t.id))?.deletedAt).not.toBeNull();
		expect((await upcomingAppointments(now)).length).toBe(0);
	});
});
