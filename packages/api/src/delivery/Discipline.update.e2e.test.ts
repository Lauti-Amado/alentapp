import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { UpdateDisciplineRequest } from '@alentapp/shared';

describe('Discipline Update API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let testDisciplineId: string;

    // Sufijo aleatorio para evitar colisiones con datos de otros tests
    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2E-UPD-${randomSuffix}`;
    const testEmail = `e2e-upd-${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // 1. Crear un socio real en PostgreSQL
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: 'Socio E2E Update',
                dni: testDni,
                email: testEmail,
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });
        const memberBody = JSON.parse(memberResponse.payload);
        testMemberId = memberBody.data.id;

        // 2. Crear una sanción real que luego actualizaremos
        const disciplineResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload: {
                motivo: 'Motivo original',
                fechaInicio: '2026-06-01',
                fechaFin: '2027-07-01',
                esSuspensionTotal: false,
                memberId: testMemberId,
                motivoLevantamiento: null,
            },
        });
        const disciplineBody = JSON.parse(disciplineResponse.payload);
        testDisciplineId = disciplineBody.data.id;
    });

    afterAll(async () => {
        if (testDisciplineId) {
            await prisma.discipline.deleteMany({ where: { id: testDisciplineId } });
        }
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe persistir la actualización en PostgreSQL y retornar 200', async () => {
        const payload: UpdateDisciplineRequest = {
            motivo: 'Actualizado en E2E',
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/disciplines/${testDisciplineId}`,
            payload,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBe(testDisciplineId);
        expect(body.data.motivo).toBe('Actualizado en E2E');

        // Verificar directamente en la base de datos que el cambio fue persistido
        const record = await prisma.discipline.findUnique({ where: { id: testDisciplineId } });
        expect(record).not.toBeNull();
        expect(record!.motivo).toBe('Actualizado en E2E');
    });
});
