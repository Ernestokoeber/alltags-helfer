import { test, expect, type Page } from '@playwright/test';

// Smoke-Test: breit & flach. Jeder Test bekommt einen frischen Browser-Context
// (eigene IndexedDB) → die Tests beeinflussen sich nicht.

// Klick in der Desktop-Seitenleiste. Eindeutig über das aria-label, sonst kollidiert
// es mit der mobilen Bottom-Navigation, die im DOM ebenfalls vorhanden ist.
function navLink(page: Page, name: string) {
	return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name });
}

test('App lädt und alle Tabs sind über die Navigation erreichbar', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Schnellnotiz für heute' })).toBeVisible();

	const tabs = [
		['Notizen', '/notizen'],
		['Aufgaben', '/aufgaben'],
		['Projekte', '/projekte'],
		['Termine', '/termine'],
		['Arbeit', '/arbeit'],
		['Tracking', '/tracking']
	] as const;

	for (const [tab, urlteil] of tabs) {
		await navLink(page, tab).click();
		await expect(page).toHaveURL(new RegExp(`${urlteil}$`));
		await expect(page.getByRole('heading', { name: tab, exact: true })).toBeVisible();
	}
});

test('Schnellnotiz auf „Heute" anlegen', async ({ page }) => {
	await page.goto('/');
	await page.getByPlaceholder('Was möchtest du festhalten?').fill('E2E Schnellnotiz');
	await page.getByRole('button', { name: 'Speichern' }).click();
	// Erscheint sowohl in „Heute notiert" als auch im Desktop-Panel rechts → .first().
	await expect(page.getByText('E2E Schnellnotiz').first()).toBeVisible();
});

test('Aufgabe anlegen', async ({ page }) => {
	await page.goto('/aufgaben');
	await page.getByPlaceholder('Was ist zu tun?').fill('E2E Aufgabe');
	await page.getByRole('button', { name: 'Aufgabe hinzufügen' }).click();
	await expect(page.getByText('E2E Aufgabe')).toBeVisible();
});

test('Arbeit-Tab: Pin, Kollegen-Notiz und Support-Fall', async ({ page }) => {
	await page.goto('/arbeit');

	// Anheft-Bereich: Pin anheften
	await page.getByRole('button', { name: '+ anheften' }).click();
	await page.getByPlaceholder(/Workflow oder Notiz/).fill('E2E Workflow-Pin');
	await page.getByRole('button', { name: 'Anheften' }).click();
	await expect(page.getByText('E2E Workflow-Pin')).toBeVisible();

	// Kollegen-Notiz (Bereich „Kollegen-Notizen" ist Default)
	await page.getByPlaceholder(/Notiz für den Kollegen/).fill('E2E Kollegennotiz');
	await page.getByRole('button', { name: 'Notiz speichern' }).click();
	await expect(page.getByText('E2E Kollegennotiz')).toBeVisible();

	// Kundensupport-Fall
	await page.getByRole('button', { name: 'Kundensupport' }).click();
	await page.getByPlaceholder('Kunde', { exact: true }).fill('E2E Kunde');
	await page.getByPlaceholder('Problem', { exact: true }).fill('E2E Problem');
	await page.getByRole('button', { name: 'Fall anlegen' }).click();
	await expect(page.getByText('E2E Kunde')).toBeVisible();
});

test('Tracking: Eintrag erfassen', async ({ page }) => {
	await page.goto('/tracking');
	await page.getByRole('button', { name: 'AP1', exact: true }).first().click(); // Fach-Preset
	await page.getByLabel('Dauer in Minuten').first().fill('45');
	await page.getByRole('button', { name: 'Eintrag speichern' }).click();
	// „Einträge"-Überschrift erscheint erst, wenn mindestens ein Eintrag existiert.
	await expect(page.getByRole('heading', { name: 'Einträge' })).toBeVisible();
});

test('Sphären-Umschalter wechselt die aktive Sphäre', async ({ page }) => {
	await page.goto('/');
	// Desktop-Layout: der erste „Sphäre wählen"-Umschalter ist der in der Seitenleiste.
	const gruppe = page.getByRole('group', { name: 'Sphäre wählen' }).first();
	await gruppe.getByRole('button', { name: 'Arbeit' }).click();
	await expect(gruppe.getByRole('button', { name: 'Arbeit' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});
