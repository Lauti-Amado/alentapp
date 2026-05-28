import { test, expect } from '@playwright/test';

test.describe('Sports E2E (Create only)', () => {

  test.beforeEach(async ({ page }) => {
    const mockDb = [
      {
        id: '1',
        Nombre: 'Basquet',
        Cupo_maximo: 20,
        Precio_adicional: 1000,
        Descripcion: 'Deporte existente',
        Require_certificado_medico: true
      }
    ];

    // Intercepta la API de forma global usando comodines (**), más seguro que RegExp local
    await page.route('**/api/v1/sports', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb })
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newSport = { id: String(mockDb.length + 1), ...payload };
        mockDb.push(newSport);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newSport })
        });
      } else {
        await route.continue();
      }
    });

    // ¡REVISA ESTA RUTA! Asegúrate de que exista en tu App (ej. '/sports' o '/')
    await page.goto('/deportes'); 
  });

  test('debe crear un deporte desde la UI', async ({ page }) => {
    // Ahora que la página cargue correctamente, el botón será visible
    await page.getByRole('button', { name: 'Agregar Deporte' }).click();

    await expect(page.getByText('Agregar Nuevo Deporte')).toBeVisible();

    await page.getByPlaceholder('Ej. Fútbol').fill('Futbol E2E');
    await page.getByPlaceholder('Ej. 30').fill('25');
    await page.getByPlaceholder('Ej. 1500').fill('1500');
    await page.getByRole('textbox', { name: 'Descripción' }).fill('test e2e');

    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    await expect(page.getByText('Futbol E2E')).toBeVisible();
    await expect(page.getByText('25')).toBeVisible();
    await page.pause();
  });
});