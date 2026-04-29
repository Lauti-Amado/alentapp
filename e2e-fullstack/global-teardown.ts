/**
 * global-teardown.ts para Playwright Full-Stack E2E.
 * Se ejecuta UNA VEZ después de todos los tests.
 * Cierra la instancia de la API de test.
 */
export default async function globalTeardown() {
    const server = (globalThis as any).__e2e_api_server__;
    if (server) {
        await server.close();
        console.log('[E2E Teardown] API de test cerrada.');
    }
}
