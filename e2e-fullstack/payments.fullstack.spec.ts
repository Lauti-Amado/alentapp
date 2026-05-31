import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Page } from '@playwright/test';

const API_URL = 'http://localhost:3001';
const DB_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';

type MemberFixture = {
  id: string;
  dni: string;
  name: string;
  email: string;
};

type PaymentFixture = {
  id: string;
  memberId: string;
};

type PaymentsPageDiagnostics = {
  consoleErrors: string[];
  failedResponses: string[];
};

const createdMemberIds: string[] = [];
const createdPaymentIds: string[] = [];

async function createMemberFixture(name: string): Promise<MemberFixture> {
  const uniqueValue = randomUUID();
  const member = {
    id: randomUUID(),
    dni: `payment-e2e-${uniqueValue}`,
    name,
    email: `payment-e2e-${uniqueValue}@test.com`,
  };

  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO members (id, dni, name, email, birthdate, category)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [member.id, member.dni, member.name, member.email, '1990-01-01', 'Pleno'],
    );
  } finally {
    await client.end();
  }

  createdMemberIds.push(member.id);
  return member;
}

async function createPaymentFixture(
  request: APIRequestContext,
  memberId: string,
): Promise<PaymentFixture> {
  const response = await request.post(`${API_URL}/api/v1/pagos`, {
    data: {
      member_id: memberId,
      monto: 15000,
      mes: 5,
      anio: 2026,
      fecha_vencimiento: '2026-05-10',
    },
  });
  expect(response.status()).toBe(201);

  const payment = {
    id: (await response.json()).data.id as string,
    memberId,
  };
  createdPaymentIds.push(payment.id);
  return payment;
}

async function cleanupFixtures(): Promise<void> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    if (createdPaymentIds.length > 0) {
      await client.query('DELETE FROM payments WHERE id = ANY($1::text[])', [createdPaymentIds]);
    }
    if (createdMemberIds.length > 0) {
      await client.query('DELETE FROM payments WHERE member_id = ANY($1::text[])', [createdMemberIds]);
      await client.query('DELETE FROM members WHERE id = ANY($1::text[])', [createdMemberIds]);
    }
  } finally {
    createdPaymentIds.length = 0;
    createdMemberIds.length = 0;
    await client.end();
  }
}

function createPaymentsPageDiagnostics(page: Page): PaymentsPageDiagnostics {
  const diagnostics: PaymentsPageDiagnostics = {
    consoleErrors: [],
    failedResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') {
      diagnostics.consoleErrors.push(message.text());
    }
  });

  page.on('response', (response) => {
    if (
      !response.ok() &&
      /\/api\/v1\/(?:pagos|socios)(?:[/?]|$)/.test(response.url())
    ) {
      diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  return diagnostics;
}

function summarizeVisibleContent(bodyText: string): string {
  return bodyText.replace(/\s+/g, ' ').trim().slice(0, 1200) || '<pantalla vacia>';
}

function formatDiagnostics(diagnostics: PaymentsPageDiagnostics): string {
  return (
    ` Errores de consola: ${diagnostics.consoleErrors.join(' | ') || 'ninguno capturado'}.` +
    ` Requests fallidos relevantes: ${diagnostics.failedResponses.join(' | ') || 'ninguno capturado'}.`
  );
}

async function expectPaymentsPageReady(
  page: Page,
  diagnostics: PaymentsPageDiagnostics,
): Promise<void> {
  await expect(page).toHaveURL(/\/payments$/);

  const bodyText = await page.locator('body').innerText();
  if (
    bodyText.includes('[plugin:vite:') ||
    bodyText.includes('Transform failed') ||
    bodyText.includes('[PARSE_ERROR]')
  ) {
    throw new Error(
      `La pantalla /payments no pudo renderizarse porque Vite mostro un error de compilacion del frontend. ` +
      `Contenido visible: ${summarizeVisibleContent(bodyText)}.` +
      formatDiagnostics(diagnostics),
    );
  }

  await expect(page.getByText('Cargando pagos...')).toBeHidden({ timeout: 10000 });

  const errorTitle = page.getByText('Error:', { exact: true });
  if (await errorTitle.isVisible()) {
    const visibleMessage = (await errorTitle.locator('..').innerText()).replace(/^Error:\s*/, '').trim();
    throw new Error(
      `La pantalla /payments no cargó correctamente. ` +
      `Posible falla en GET /api/v1/socios o GET /api/v1/pagos. ` +
      `Mensaje visible: ${visibleMessage || 'sin detalle'}.` +
      formatDiagnostics(diagnostics),
    );
  }

  const addPaymentButton = page.getByRole('button', { name: 'Agregar Pago' });
  if (!(await addPaymentButton.isVisible())) {
    throw new Error(
      `La pantalla /payments no renderizo los controles esperados. ` +
      `URL actual: ${page.url()}. Titulo: ${await page.title() || '<sin titulo>'}. ` +
      `Contenido visible: ${summarizeVisibleContent(await page.locator('body').innerText())}.` +
      formatDiagnostics(diagnostics),
    );
  }

  await expect(
    page
      .getByRole('columnheader', { name: 'Socio' })
      .or(page.getByText('No se encontraron pagos.', { exact: true })),
  ).toBeVisible();
}

async function openPaymentsPage(page: Page): Promise<void> {
  const diagnostics = createPaymentsPageDiagnostics(page);
  await page.goto('/payments');
  await expectPaymentsPageReady(page, diagnostics);
}

function getPaymentRow(page: Page, member: Pick<MemberFixture, 'id' | 'name'>) {
  return page
    .getByRole('row')
    .filter({ hasText: member.name })
    .or(page.getByRole('row').filter({ hasText: member.id }));
}

test.describe('Payments Full-Stack E2E', () => {
  test.afterEach(async () => {
    await cleanupFixtures();
  });

  // Alta de Payment: prepara el Member en PostgreSQL y crea el Payment desde UI.
  test('debe crear un pago real para un socio existente y mostrarlo como Pendiente', async ({ page }) => {
    const member = await createMemberFixture(`Socio Alta Payment E2E ${randomUUID()}`);

    await openPaymentsPage(page);

    await page.getByRole('button', { name: 'Agregar Pago' }).click();
    await expect(page.getByText('Agregar Nuevo Pago')).toBeVisible();

    await page.getByText('Seleccione un socio').click();
    await page.getByRole('option', { name: `${member.name} - DNI ${member.dni}` }).click();

    await page.getByLabel('Monto').fill('15000');
    await page.getByLabel('Mes').fill('5');
    await page.getByRole('dialog').filter({ hasText: 'Agregar Nuevo Pago' }).locator('input[type="number"]').nth(2).fill('2026');
    await page.getByLabel('Fecha de vencimiento').fill('2026-05-10');
    await page.getByRole('button', { name: 'Crear Pago' }).click();

    await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden({ timeout: 10000 });
    const paymentRow = getPaymentRow(page, member);
    await expect(paymentRow).toContainText('$15000.00', { timeout: 10000 });
    await expect(paymentRow).toContainText('5/2026');
    await expect(paymentRow).toContainText('2026-05-10');
    await expect(paymentRow).toContainText('Pendiente');
  });

  // Modificacion de Payment: prepara Member y Payment propios, y edita desde UI.
  test('debe editar un pago existente desde la interfaz y mostrar los datos actualizados', async ({ page, request }) => {
    const member = await createMemberFixture(`Socio Modificacion Payment E2E ${randomUUID()}`);
    await createPaymentFixture(request, member.id);

    await openPaymentsPage(page);

    const paymentRow = getPaymentRow(page, member);
    await expect(paymentRow).toContainText('$15000.00', { timeout: 10000 });
    await expect(paymentRow).toContainText('5/2026');
    await paymentRow.getByRole('button', { name: 'Editar pago' }).click();
    await expect(page.getByText('Editar Pago')).toBeVisible();

    await page.getByLabel('Monto').fill('18000');
    await page.getByLabel('Mes').fill('6');
    await page.getByLabel('Fecha de vencimiento').fill('2026-06-10');
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden({ timeout: 10000 });
    await expect(paymentRow).toContainText('$18000.00', { timeout: 10000 });
    await expect(paymentRow).toContainText('6/2026');
    await expect(paymentRow).toContainText('2026-06-10');
  });
});
