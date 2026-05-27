import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Locker API E2E Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLockerId: string;

    // Generamos un número aleatorio para que no colisione con datos existentes
    const randomNumero = Math.floor(Math.random() * 90000) + 10000;

    beforeAll(async () => {
        // 1. Levantamos la app entera (Fastify + PostgreSQL via repositorio original)
        app = buildApp();
        await app.ready();

        // 2. Instanciamos Prisma independientemente para verificar la DB directamente
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();
    });

    afterAll(async () => {
        // Limpiamos la DB eliminando el registro si quedó vivo
        if (createdLockerId) {
            await prisma.locker.deleteMany({
                where: { id: createdLockerId }
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST E2E 3: DELETE /api/v1/lockers/:id
    // Verifica que el locker se elimina físicamente de PostgreSQL
    // y que Prisma ya no lo encuentra tras el borrado.
    // ─────────────────────────────────────────────────────────────────
    it('3. DELETE: Debe eliminar físicamente el locker de la base de datos', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/lockers/${createdLockerId}`
        });

        expect(response.statusCode).toBe(204);

        // Verificar que Prisma ya no lo encuentra en la DB real
        const dbLocker = await prisma.locker.findUnique({ where: { id: createdLockerId } });
        expect(dbLocker).toBeNull();

        // Anular variable para que afterAll no intente borrarlo nuevamente
        createdLockerId = '';
    });
});