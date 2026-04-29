/**
 * Script de arranque de la API para tests E2E Full-Stack.
 * Lee el .env.test para conectar a la DB de test y arranca en el puerto 3001.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildApp } from '../packages/api/src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../packages/api/.env.test');

// Parsear y cargar .env.test manualmente
try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...rest] = trimmed.split('=');
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
} catch {
    console.error('No se pudo leer .env.test, asegúrate de que exista.');
    process.exit(1);
}

const port = parseInt(process.env.PORT || '3001', 10);
const server = buildApp();

await server.listen({ port, host: '0.0.0.0' });
console.log(`[E2E API] Servidor de test corriendo en http://localhost:${port}`);

// Exponer el servidor en globalThis para que global-teardown pueda cerrarlo
(globalThis as any).__e2e_api_server__ = server;
