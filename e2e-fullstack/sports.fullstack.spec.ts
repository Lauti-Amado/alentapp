import { test, expect, type Page } from '@playwright/test';

//  Helper simplificado: espera carga DOM + elemento visible
async function waitForSportsView(page: Page) {
  // Esperar que el DOM cargue (sin esperar conexiones de red infinitas)
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  // Pequeño delay para que React termine de renderizar
  await page.waitForTimeout(1000);
  // Esperar el título por data-testid
  await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 10000 });
}

//  Test de debug: ejecutar con --grep "DEBUG" para ver qué hay en la página
test(' DEBUG: Ver qué hay en la página /deportes', async ({ page }) => {
  // Escuchar errores de JS y consola
  page.on('pageerror', (err) => console.error(' JS Error:', err.message));
  page.on('console', (msg) => msg.type() === 'error' && console.error('🔴 Console:', msg.text()));
  
  // Navegar SIN esperar networkidle (evita timeout por fetch pendientes)
  await page.goto('/deportes', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  // Ver contenido del body
  const bodyText = await page.locator('body').innerText();
  console.log(' Body text (primeros 500 chars):', bodyText.slice(0, 500));
  
  // Listar data-testid disponibles
  const testIds = await page.locator('[data-testid]').all();
  const ids = await Promise.all(testIds.map(el => el.getAttribute('data-testid')));
  console.log(' data-testid encontrados:', ids);
  
  // Screenshot para ver visualmente
  await page.screenshot({ path: 'debug-deportes.png', fullPage: true });
  console.log(' Screenshot guardado: debug-deportes.png');
});

test.describe('Sports Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay deportes en la DB', async ({ page }) => {
    await page.goto('/deportes', { waitUntil: 'domcontentloaded' });
    await waitForSportsView(page);

    // Usar data-testid para el estado vacío
    await expect(page.getByTestId('empty-state-text'))
      .toContainText('No se encontraron deportes registrados.', { timeout: 10000 });
  });

  test('debe crear un deporte real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/deportes', { waitUntil: 'domcontentloaded' });
    await waitForSportsView(page);

    // Click en botón agregar usando data-testid
    await page.getByTestId('btn-add-sport').click();
    
    // Esperar modal visible
    await expect(page.getByTestId('sport-modal')).toBeVisible({ timeout: 10000 });

    // Completar formulario
    await page.getByPlaceholder('Ej. Fútbol, Natación').fill('Futbol E2E');
    await page.getByPlaceholder('Ej. 30').fill('25');
    await page.getByPlaceholder('Ej. 1500').fill('3500');
    await page.getByPlaceholder('Breve descripción de la actividad')
      .fill('Deporte creado por Playwright');
    await page.locator('input[type="checkbox"]').check();

    // Guardar
    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    // Esperar que el modal se cierre
    await expect(page.getByTestId('sport-modal')).not.toBeVisible({ timeout: 10000 });
    
    // Verificar que el deporte aparece
    await expect(page.getByText('Futbol E2E')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('25')).toBeVisible();
    await expect(page.getByText('Deporte creado por Playwright')).toBeVisible();
  });

  test('debe editar el deporte creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/deportes', { waitUntil: 'domcontentloaded' });
    await waitForSportsView(page);

    // Esperar que el deporte exista
    await expect(page.getByText('Futbol E2E')).toBeVisible({ timeout: 10000 });

    // Click en editar
    await page.getByRole('button', { name: /Editar deporte/i }).first().click();

    // Esperar modal
    await expect(page.getByTestId('sport-modal')).toBeVisible({ timeout: 10000 });

    // Cambiar campos
    await page.getByPlaceholder('Ej. 30').fill('40');
    await page.getByPlaceholder('Breve descripción de la actividad')
      .fill('Deporte editado por Playwright');

    // Guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Esperar cierre del modal
    await expect(page.getByTestId('sport-modal')).not.toBeVisible({ timeout: 10000 });

    // Verificar cambios
    await expect(page.getByText('40')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Deporte editado por Playwright')).toBeVisible();
  });

  test('debe eliminar el deporte y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/deportes', { waitUntil: 'domcontentloaded' });
    await waitForSportsView(page);

    await expect(page.getByText('Futbol E2E')).toBeVisible({ timeout: 10000 });

    // Abrir confirmación
    await page.getByRole('button', { name: /Eliminar deporte/i }).first().click();
    await expect(page.getByText('Confirmar eliminación')).toBeVisible({ timeout: 10000 });

    // Confirmar
    await page.getByRole('button', { name: /^Eliminar$/ }).click();
    await page.waitForTimeout(500);

    // Verificar estado vacío
    await expect(page.getByTestId('empty-state-text'))
      .toContainText('No se encontraron deportes registrados.', { timeout: 10000 });
  });

});