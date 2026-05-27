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
    // TEST E2E 1: POST /api/v1/lockers
    // Verifica que se crea el locker en PostgreSQL real, con estado
    // Disponible y member_id nulo, y que Prisma lo encuentra en la DB.
    // ─────────────────────────────────────────────────────────────────
    it('1. POST: Debe crear un locker en la base de datos real', async () => {
        const payload = {
            numero: randomNumero,
            ubicacion: 'Vestuario E2E'
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.numero).toBe(randomNumero);
        expect(body.data.estado).toBe('Disponible');
        expect(body.data.member_id).toBeNull();
        expect(body.message).toBe('Locker creado con éxito');

        // Guardamos el ID para usarlo en los tests siguientes
        createdLockerId = body.data.id;

        // Verificación directa E2E: ¿Se guardó realmente en PostgreSQL?
        const dbLocker = await prisma.locker.findUnique({ where: { id: createdLockerId } });
        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.numero).toBe(randomNumero);
        expect(dbLocker?.ubicacion).toBe('Vestuario E2E');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST E2E 2: PUT /api/v1/lockers/:id
    // Verifica que se actualiza el locker creado en el test anterior
    // y que Prisma confirma el cambio directamente en PostgreSQL.
    // ─────────────────────────────────────────────────────────────────
    it('2. PUT: Debe actualizar el locker modificando la base de datos', async () => {
        const updatePayload = {
            ubicacion: 'Vestuario E2E Modificado'
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/lockers/${createdLockerId}`,
            payload: updatePayload
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.ubicacion).toBe('Vestuario E2E Modificado');

        // Verificar directamente en PostgreSQL que el campo se modificó
        const dbLocker = await prisma.locker.findUnique({ where: { id: createdLockerId } });
        expect(dbLocker?.ubicacion).toBe('Vestuario E2E Modificado');
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