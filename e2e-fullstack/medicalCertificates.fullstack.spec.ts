import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001';

const SEED_MEMBER = {
    dni: '45910179',
    name: 'Socio Test MedicalCertificate',
    email: 'alentappmedcer@e2e.com',
    birthdate: '2000-07-10',
    category: 'Pleno' as const,
};

const fecha_vencimiento_ORIGINAL = '2026-06-25';
const fecha_vencimiento_EDITADO = '2026-07-25';
const TEXTO_FECHA_ORIGINAL = '25/06/2026';
const TEXTO_FECHA_EDITADO = '25/07/2026';

test.describe('Medical Certificates Full-Stack E2E', () => {

    test.beforeEach(async ({ request }) => {
        const res = await request.post(`${API_URL}/api/v1/socios`, {
            data: SEED_MEMBER,
            timeout: 5000
        });

        // Acepta 201 (Creado con éxito) o 409 (Ya existía de un test previo)
        expect([201, 409]).toContain(res.status());
    });

    test.afterAll(async ({ request }) => {
        // Obtener el id del socio y eliminarlo para no contaminar otras suites
        const res = await request.get(`${API_URL}/api/v1/socios/dni/${ SEED_MEMBER.dni}`);
        if (res.ok()) {
            const { data } = await res.json();
            await request.delete(`${API_URL}/api/v1/socios/${data.id}`);
        }
    });

    test('debe mostrar el estado vacío cuando no hay certificados médicos en la DB', async ({ page }) => {
        // Usar 'commit' o dejar por defecto, pero ahora el entorno no estará bloqueado
        await page.goto('/medical_certificates', { waitUntil: 'commit' });

        // Esperar a que el spinner de carga de React desaparezca
        await expect(page.getByText('Cargando certificados médicos...')).toBeHidden({ timeout: 10000 });

        // Verificar el estado vacío
        await expect(page.getByText('No hay certificados médicos registrados.')).toBeVisible({ timeout: 5000 });
    });

    test('debe crear un certificado médico real y mostrarla en la tabla', async ({ page }) => {
        await page.goto('/medical_certificates');

        // Abrir modal de creación
        await page.getByRole('button', { name: 'Registrar Certificado Médico' }).click();
        await expect(page.getByText('Registrar Nuevo Certificado Médico')).toBeVisible();

        // Buscar al socio por DNI para obtener el memberId
        await page.getByPlaceholder('Ej. 12345678').fill(SEED_MEMBER.dni);
        await page.getByRole('button', { name: 'Buscar' }).click();

        // Esperamos el contenedor verde de Chakra que confirma el socio encontrado
        await expect(page.getByText(`✓ ${SEED_MEMBER.name}`)).toBeVisible({ timeout: 10000 });

        // Completar el formulario con datos válidos según tu Frontend
        await page.getByLabel('Licencia del médico').fill('929/911002');
        await page.getByLabel('Fecha de emisión').fill('2026-06-01');
        await page.getByLabel('Fecha de vencimiento').fill(fecha_vencimiento_ORIGINAL);

        // El botón submit está dentro del dialog
        const submitBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Registrar Certificado Médico' });
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // Verificar que el modal se cerró y el certificado aparece con el formato visible (DD/MM/YYYY)
        await expect(page.getByText('Registrar Nuevo Certificado Médico')).toBeHidden({ timeout: 10000 });
        await expect(page.getByText(TEXTO_FECHA_ORIGINAL)).toBeVisible({ timeout: 10000 });
    });

    test('debe editar el certificado médico creado y ver el cambio en la tabla', async ({ page }) => {
        await page.goto('/medical_certificates');

        // Esperar que el certificado esté en la tabla
        await expect(page.getByText(TEXTO_FECHA_ORIGINAL)).toBeVisible({ timeout: 10000 });

        // Clic en el botón Editar de la fila correspondiente
        await page.getByRole('row').filter({ hasText: TEXTO_FECHA_ORIGINAL }).getByRole('button', { name: 'Editar' }).click();
        await expect(page.getByText('Editar Certificado Médico')).toBeVisible();

        // Cambiar la fecha de vencimiento en el modal de edición
        const fecha_vencimientoInput = page.locator('[role="dialog"]').getByLabel('Fecha de vencimiento');
        await fecha_vencimientoInput.clear();
        await fecha_vencimientoInput.fill(fecha_vencimiento_EDITADO);

        // Guardar cambios
        await page.getByRole('button', { name: 'Guardar Cambios' }).click();
        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden({ timeout: 10000 });

        // Verificar el cambio en la tabla usando el formato visible
        await expect(page.getByText(TEXTO_FECHA_EDITADO)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(TEXTO_FECHA_ORIGINAL, { exact: true })).toBeHidden();
    });

    test('debe eliminar un certificado médico y mostrar el estado vacío', async ({ page }) => {
        await page.goto('/medical_certificates');

        // Aceptar automáticamente el window.confirm nativo que maneja tu frontend
        page.on('dialog', (dialog) => dialog.accept());

        // Clic en el botón Eliminar de la fila editada
        await page.getByRole('row').filter({ hasText: TEXTO_FECHA_EDITADO }).getByRole('button', { name: 'Eliminar' }).click();

        // La tabla debería volver al estado vacío inicial
        await expect(page.getByText('No hay certificados médicos registrados.')).toBeVisible({ timeout: 10000 });
    });
});