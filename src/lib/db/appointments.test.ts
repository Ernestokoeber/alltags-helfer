import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
	addAppointment,
	upcomingAppointments,
	deleteAppointment,
	appointmentsForProject,
	appointmentCountByProject
} from './appointments';

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
		expect(t.category).toBe('offen'); // ohne Angabe: unsortiert → in jeder Sphäre sichtbar
		expect(await db.appointments.get(t.id)).toBeDefined();
	});

	it('addAppointment übernimmt die Kategorie (Privat/Arbeit)', async () => {
		const t = await addAppointment({
			title: 'Sprint-Review',
			startAt: Date.now() + 86_400_000,
			category: 'geschaeftlich'
		});
		expect((await db.appointments.get(t.id))?.category).toBe('geschaeftlich');
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

	it('addAppointment übernimmt den Projektbezug', async () => {
		const t = await addAppointment({
			title: 'Projekttermin',
			startAt: Date.now() + 1000,
			projectId: 'projekt-1'
		});
		expect((await db.appointments.get(t.id))?.projectId).toBe('projekt-1');
	});

	it('appointmentsForProject: nur Termine des Projekts, aufsteigend, ohne gelöschte', async () => {
		const now = Date.now();
		await addAppointment({ title: 'spät', startAt: now + 5000, projectId: 'p1' });
		await addAppointment({ title: 'früh', startAt: now + 1000, projectId: 'p1' });
		await addAppointment({ title: 'anderes Projekt', startAt: now + 2000, projectId: 'p2' });
		const weg = await addAppointment({ title: 'gelöscht', startAt: now + 3000, projectId: 'p1' });
		await deleteAppointment(weg.id);

		const liste = await appointmentsForProject('p1');
		expect(liste.map((t) => t.title)).toEqual(['früh', 'spät']);
	});

	it('appointmentCountByProject zählt aktive Termine je Projekt', async () => {
		const now = Date.now();
		await addAppointment({ title: 'a', startAt: now + 1000, projectId: 'p1' });
		await addAppointment({ title: 'b', startAt: now + 2000, projectId: 'p1' });
		await addAppointment({ title: 'c', startAt: now + 3000, projectId: 'p2' });
		await addAppointment({ title: 'ohne Projekt', startAt: now + 4000 });

		const counts = await appointmentCountByProject();
		expect(counts.get('p1')).toBe(2);
		expect(counts.get('p2')).toBe(1);
	});
});
