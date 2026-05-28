import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Lockers.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 * Los tests corren SECUENCIALMENTE (workers: 1), el locker creado
 * en el test 1 es usado por los tests 2, 3 y 4.
 */

test.describe('Lockers Full-Stack E2E', () => {

  // ─────────────────────────────────────────────────────────────────
  // TEST E2E 1: Estado vacío
  // Verifica que cuando la DB está limpia, la vista muestra el empty state.
  // Flujo: Browser -> React (Lockers.tsx) -> GET /api/v1/lockers -> PostgreSQL vacío
  // ─────────────────────────────────────────────────────────────────
  test('debe mostrar el estado vacío cuando no hay lockers en la DB', async ({ page }) => {
    await page.goto('/lockers');
    await expect(page.getByText('No se encontraron lockers.')).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST E2E 2: Crear un locker real
  // Verifica el flujo completo de creación: formulario -> API real -> DB real -> tabla.
  // Flujo: Browser -> React -> POST /api/v1/lockers -> PostgreSQL -> GET -> tabla
  // ─────────────────────────────────────────────────────────────────
  test('debe crear un locker real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/lockers');

    // Abrir modal de creación
    await page.locator('button:has-text("Nuevo Locker")').click();
    await expect(page.getByText('Registrar Nuevo Locker')).toBeVisible();

    // Llenar formulario con datos reales
    await page.getByPlaceholder('Ej. 11').fill('11');
    await page.getByPlaceholder('Ej. Vestuario Masculino').fill('Vestuario Masculino E2E');

    // Lockers.tsx hace alert() al crear con éxito, lo aceptamos
    page.on('dialog', dialog => dialog.accept());

    // Guardar
    await page.getByRole('button', { name: 'Crear Locker' }).click();

    // Esperar que el modal se cierre y el locker aparezca en la tabla real
    await expect(page.getByRole('button', { name: 'Crear Locker' })).toBeHidden();
    await expect(page.getByText('11')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Vestuario Masculino E2E')).toBeVisible();
    await expect(page.getByText('Disponible', { exact: true })).toBeVisible();  });

  // ─────────────────────────────────────────────────────────────────
  // TEST E2E 3: Editar el locker creado
  // Verifica el flujo completo de edición: abrir modal -> modificar
  // ubicación -> guardar -> verificar cambio en la tabla real.
  // Flujo: Browser -> React -> PUT /api/v1/lockers/:id -> PostgreSQL -> GET -> tabla
  // ─────────────────────────────────────────────────────────────────
  test('debe editar el locker creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/lockers');

    // El locker del test anterior debe estar en la tabla
    await expect(page.getByText('11')).toBeVisible({ timeout: 10000 });

    // Clic en editar
    await page.getByRole('button', { name: /Editar locker/i }).first().click();
    await expect(page.getByText('Editar Locker')).toBeVisible();

    // Modificar la ubicación
    const ubicacionInput = page.getByPlaceholder('Ej. Vestuario Masculino');
    await ubicacionInput.fill('Vestuario Femenino E2E');

    // Guardar cambios
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar cambio en la tabla
    await expect(page.getByText('Vestuario Femenino E2E')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Vestuario Masculino E2E')).toBeHidden();
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST E2E 4: Eliminar el locker creado
  // Verifica el flujo completo de eliminación y que la tabla queda vacía.
  // Flujo: Browser -> React -> DELETE /api/v1/lockers/:id -> PostgreSQL -> GET -> empty state
  // ─────────────────────────────────────────────────────────────────
  test('debe eliminar el locker y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/lockers');

    // El locker del test anterior debe estar en la tabla
    await expect(page.getByText('11')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Vestuario Femenino E2E')).toBeVisible();

    // Aceptar el confirm del navegador automáticamente
    page.on('dialog', dialog => dialog.accept());

    // Clic en eliminar
    await page.getByRole('button', { name: /Eliminar locker/i }).first().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No se encontraron lockers.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Vestuario Masculino E2E')).toBeHidden();
  });
});