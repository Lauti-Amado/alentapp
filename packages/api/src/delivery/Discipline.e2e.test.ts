import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

describe('Discipline API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let createdDisciplineId: string;

    // Sufijo aleatorio para evitar colisiones con datos de desarrollo existentes
    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2E-DISC-${randomSuffix}`;
    const testEmail = `e2e-disc-${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // Crear un socio real en PostgreSQL para usarlo como FK en las sanciones
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: 'Socio E2E Discipline',
                dni: testDni,
                email: testEmail,
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });
        const memberBody = JSON.parse(memberResponse.payload);
        testMemberId = memberBody.data.id;
    });

    afterAll(async () => {
        // Tear down: eliminar sanción y socio creados durante el test
        if (createdDisciplineId) {
            await prisma.discipline.deleteMany({ where: { id: createdDisciplineId } });
        }
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe persistir la sanción en PostgreSQL y retornar 201', async () => {
        const payload: CreateDisciplineRequest = {
            motivo: 'Conducta inapropiada en instalaciones',
            fechaInicio: '2026-06-01',
            fechaFin: '2026-07-01',
            esSuspensionTotal: true,
            memberId: testMemberId,
            motivoLevantamiento: null,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBeDefined();
        expect(body.data.motivo).toBe(payload.motivo);
        expect(body.data.esSuspensionTotal).toBe(true);

        createdDisciplineId = body.data.id;

        // Verificación directa E2E: ¿Se guardó realmente en PostgreSQL?
        const dbDiscipline = await prisma.discipline.findUnique({ where: { id: createdDisciplineId } });
        expect(dbDiscipline).not.toBeNull();
        expect(dbDiscipline?.esSuspensionTotal).toBe(true);
        expect(dbDiscipline?.memberId).toBe(testMemberId);
        expect(dbDiscipline?.motivoLevantamiento).toBeNull();
    });
});
