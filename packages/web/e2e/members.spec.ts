import { test, expect } from '@playwright/test';

test.describe('Members E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    // Estado en memoria simulando la Base de Datos para estos tests
    const mockDb = [
      {
        id: '1',
        dni: '12345678',
        name: 'Playwright Tester',
        email: 'test@playwright.dev',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: new Date().toISOString()
      }
    ];

    // Interceptamos todas las llamadas de red hacia nuestro backend real
    // De este modo, nuestros tests E2E del frontend son resilientes y no dependen 
    // de que la base de datos de PostgreSQL esté levantada.
    await page.route(/\/api\/v1\/socios/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb })
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newMember = {
          id: String(mockDb.length + 1),
          status: 'Activo', // Por defecto cuando se crea
          created_at: new Date().toISOString(),
          ...payload
        };
        // Insertamos en nuestra BD falsa para que el próximo GET lo traiga
        mockDb.push(newMember);

        // Simulamos la creación exitosa devolviendo lo creado
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newMember })
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      } else if (method === 'PUT') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockDb.findIndex(m => String(m.id) === String(id));
        
        console.log('PUT payload', payload, 'found index', index);
        
        if (index > -1) {
          mockDb[index] = { ...mockDb[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockDb[index] })
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
        }
      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockDb.findIndex(m => String(m.id) === String(id));
        console.log('DELETE id', id, 'found index', index);
        if (index > -1) {
          mockDb.splice(index, 1);
        }

        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    // Navegamos directamente a la vista de miembros
    await page.goto('/members');
  });

  test('debe mostrar la lista de socios cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que nuestro dato simulado esté pintado en la tabla HTML real
    await expect(page.getByText('Playwright Tester')).toBeVisible();
    await expect(page.getByText('12345678')).toBeVisible();
  });

  test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
    // Buscar y clickear en "Agregar Miembro" (ignoramos el icono y buscamos por texto)
    await page.locator('button:has-text("Agregar Miembro")').click();

    // Verificamos que el modal se abrió
    await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

    // Llenar el formulario simulando tipeo real de usuario
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Socio Nuevo E2E');
    await page.getByPlaceholder('Ej. 12345678').fill('99999999');
    await page.getByPlaceholder('ejemplo@correo.com').fill('e2e@test.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('2000-01-01');

    // Clic en enviar
    await page.getByRole('button', { name: 'Crear Miembro' }).click();

    // Verificamos que el modal se cerró con éxito (el botón de guardar ya no está)
    await expect(page.getByRole('button', { name: 'Crear Miembro' })).toBeHidden();

    // Verificamos que el componente hizo refresh (GET) y muestra el nuevo socio en la tabla
    await expect(page.getByText('Socio Nuevo E2E')).toBeVisible();
    await expect(page.getByText('99999999')).toBeVisible();
  });
  test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
    // Buscar y clickear en el botón de edición del único socio existente
    await page.getByRole('button', { name: /Editar miembro/i }).click();

    // Verificamos que el modal se abrió con el título correcto
    await expect(page.getByText('Editar Miembro')).toBeVisible();

    // Modificar el nombre
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Playwright Tester Modificado');

    // Clic en guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Esperar que se cierre
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar en la tabla
    await expect(page.getByText('Playwright Tester Modificado')).toBeVisible();
  });

  test('debe poder eliminar un miembro tras aceptar la alerta de confirmación', async ({ page }) => {
    // Escuchar el evento del dialog "confirm" del navegador y aceptarlo automáticamente
    page.on('dialog', dialog => dialog.accept());

    // Asegurarnos que el miembro está en la tabla antes de borrar
    await expect(page.getByText('Playwright Tester')).toBeVisible();

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar miembro/i }).click();

    // Verificar que la tabla se actualice y muestre el empty state
    await expect(page.getByText('No se encontraron miembros.')).toBeVisible();
    await expect(page.getByText('Playwright Tester')).toBeHidden();
  });
});
