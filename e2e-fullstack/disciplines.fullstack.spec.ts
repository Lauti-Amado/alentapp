import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Sanciones (Disciplines).
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup limpia TODAS las tablas antes de correr la suite.
 * Dado que crear una sanción requiere un socio preexistente, se siembra
 * uno vía API en `test.beforeAll` antes de ejecutar los 3 tests.
 * Los tests son secuenciales y con estado compartido (el mismo socio
 * y la misma sanción viajan a través de los 3 tests).
 */

const API_URL = 'http://localhost:3001';

const SEED_MEMBER = {
  dni: '99988877',
  name: 'Socio Test Sanciones',
  email: 'sancion@e2e.com',
  birthdate: '1990-01-01',
  category: 'Pleno' as const,
};

const MOTIVO_ORIGINAL = 'Conducta inapropiada en instalaciones E2E';
const MOTIVO_EDITADO = 'Conducta inapropiada en instalaciones E2E Editada';

test.describe('Disciplines Full-Stack E2E', () => {

  /**
   * Siembra un socio real vía API antes de los tests.
   * El global-setup ya limpió la DB, así que el DNI está disponible.
   */
  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/socios`, {
      data: SEED_MEMBER,
    });
    expect(res.status()).toBe(201);
  });

  test('debe mostrar el estado vacío cuando no hay sanciones en la DB', async ({ page }) => {
    await page.goto('/disciplines');
    await expect(page.getByText('No hay sanciones registradas.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear una sanción real y mostrarla en la tabla', async ({ page }) => {
    await page.goto('/disciplines');

    // Abrir modal de creación
    await page.getByRole('button', { name: 'Registrar Sanción' }).click();
    await expect(page.getByText('Registrar Nueva Sanción')).toBeVisible();

    // Buscar al socio por DNI para obtener el memberId
    await page.getByPlaceholder('Ej. 12345678').fill(SEED_MEMBER.dni);
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByText(SEED_MEMBER.name)).toBeVisible({ timeout: 10000 });

    // Completar el formulario con datos de la sanción
    await page.getByPlaceholder('Ej. Conducta inapropiada en instalaciones').fill(MOTIVO_ORIGINAL);
    await page.getByLabel('Fecha de inicio').fill('2027-01-01');
    await page.getByLabel('Fecha de fin').fill('2027-06-30');

    // El botón submit está dentro del dialog y queda deshabilitado hasta que se resuelve el DNI
    const submitBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Registrar Sanción' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verificar que el modal se cerró y la sanción aparece en la tabla
    await expect(page.getByText('Registrar Nueva Sanción')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(MOTIVO_ORIGINAL)).toBeVisible({ timeout: 10000 });
  });

  test('debe editar la sanción creada y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/disciplines');

    // Esperar que la sanción del test anterior esté en la tabla
    await expect(page.getByText(MOTIVO_ORIGINAL)).toBeVisible({ timeout: 10000 });

    // Clic en el botón Editar (primer IconButton de acciones en la fila)
    // Orden de botones cuando la sanción es Vigente: Editar · Levantar · Eliminar
    await page.getByRole('row').filter({ hasText: MOTIVO_ORIGINAL }).getByRole('button').first().click();
    await expect(page.getByText('Editar Sanción')).toBeVisible();

    // Cambiar el motivo en el modal de edición
    const motivoInput = page.locator('[role="dialog"]').getByLabel('Motivo');
    await motivoInput.clear();
    await motivoInput.fill(MOTIVO_EDITADO);

    // Guardar cambios
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden({ timeout: 10000 });

    // Verificar el cambio en la tabla
    await expect(page.getByText(MOTIVO_EDITADO)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(MOTIVO_ORIGINAL, { exact: true })).toBeHidden();
  });

  test('debe eliminar la sanción y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/disciplines');

    // La sanción editada debe seguir visible
    await expect(page.getByText(MOTIVO_EDITADO)).toBeVisible({ timeout: 10000 });

    // Aceptar automáticamente el window.confirm y el alert posterior a la eliminación
    page.on('dialog', (dialog) => dialog.accept());

    // Clic en el botón Eliminar (último IconButton de acciones en la fila)
    await page.getByRole('row').filter({ hasText: MOTIVO_EDITADO }).getByRole('button').last().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No hay sanciones registradas.')).toBeVisible({ timeout: 10000 });
  });
});
