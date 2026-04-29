import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Miembros.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5173
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Members Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay miembros en la DB', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByText('No se encontraron miembros.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un miembro real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/members');

    // Abrir modal de creación
    await page.locator('button:has-text("Agregar Miembro")').click();
    await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

    // Llenar formulario con datos reales
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Test E2E Fullstack');
    await page.getByPlaceholder('Ej. 12345678').fill('55566677');
    await page.getByPlaceholder('ejemplo@correo.com').fill('fullstack@e2e.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1995-06-15');

    // Guardar
    await page.getByRole('button', { name: 'Crear Miembro' }).click();

    // Esperar que el modal se cierre y el miembro aparezca en la tabla real
    await expect(page.getByRole('button', { name: 'Crear Miembro' })).toBeHidden();
    await expect(page.getByText('Test E2E Fullstack')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('55566677')).toBeVisible();
  });

  test('debe editar el miembro creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/members');

    // Esperar que el miembro del test anterior esté en la tabla
    await expect(page.getByText('Test E2E Fullstack')).toBeVisible({ timeout: 10000 });

    // Clic en Editar
    await page.getByRole('button', { name: /Editar miembro/i }).first().click();
    await expect(page.getByText('Editar Miembro')).toBeVisible();

    // Cambiar el nombre
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Test E2E Fullstack Editado');

    // Guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar cambio en la tabla
    await expect(page.getByText('Test E2E Fullstack Editado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test E2E Fullstack', { exact: true })).toBeHidden();
  });

  test('debe eliminar el miembro y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/members');

    // El miembro debería seguir ahí tras el test anterior
    await expect(page.getByText('Test E2E Fullstack Editado')).toBeVisible({ timeout: 10000 });

    // Aceptar el confirm del navegador automáticamente
    page.on('dialog', (dialog) => dialog.accept());

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar miembro/i }).first().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No se encontraron miembros.')).toBeVisible({ timeout: 10000 });
  });
});
