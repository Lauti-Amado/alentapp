import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E Full-Stack con Docker.
 * 
 *  - testDir apunta a ./e2e-fullstack
 *  - globalSetup espera a que la API en Docker esté lista y limpia la DB
 *  - baseURL apunta al servicio web-test en Docker (localhost:5174)
 *  - Los tests se ejecutan SECUENCIALMENTE (workers: 1)
 */
export default defineConfig({
  testDir: './e2e-fullstack',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-fullstack' }]
  ],

  globalSetup: './e2e-fullstack/global-setup.ts',

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
