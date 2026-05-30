import { test, expect } from '@playwright/test';

test.describe('Payments Full-Stack E2E', () => {
  test('debe crear un pago real para un socio existente y mostrarlo como Pendiente', async ({ page }) => {
    const suffix = Date.now().toString();
    const memberName = `Socio Pago E2E ${suffix}`;
    const memberDni = suffix.slice(-8);
    const memberEmail = `payment-e2e-${suffix}@test.com`;

    await page.goto('/members');

    await page.getByRole('button', { name: 'Agregar Miembro' }).click();
    await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

    await page.getByPlaceholder('Ej. Juan Pérez').fill(memberName);
    await page.getByPlaceholder('Ej. 12345678').fill(memberDni);
    await page.getByPlaceholder('ejemplo@correo.com').fill(memberEmail);
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1990-01-01');
    await page.getByRole('button', { name: 'Crear Miembro' }).click();

    await expect(page.getByRole('button', { name: 'Crear Miembro' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(memberName)).toBeVisible({ timeout: 10000 });

    await page.goto('/payments');
    await expect(page.getByText('No se encontraron pagos.')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Agregar Pago' }).click();
    await expect(page.getByText('Agregar Nuevo Pago')).toBeVisible();

    await page.getByText('Seleccione un socio').click();
    await page.getByRole('option', { name: `${memberName} - DNI ${memberDni}` }).click();

    await page.getByLabel('Monto').fill('15000');
    await page.getByLabel('Mes').fill('5');
    await page.getByLabel('Año').fill('2026');
    await page.getByLabel('Fecha de vencimiento').fill('2026-05-10');

    await page.getByRole('button', { name: 'Crear Pago' }).click();

    await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden({ timeout: 10000 });
    await expect(page.getByRole('row').filter({ hasText: memberName })).toContainText('$15000.00', { timeout: 10000 });
    await expect(page.getByRole('row').filter({ hasText: memberName })).toContainText('5/2026');
    await expect(page.getByRole('row').filter({ hasText: memberName })).toContainText('2026-05-10');
    await expect(page.getByRole('row').filter({ hasText: memberName })).toContainText('Pendiente');
  });
});
