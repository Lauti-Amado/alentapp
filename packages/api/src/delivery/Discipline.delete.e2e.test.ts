import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Discipline Delete API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let testDisciplineId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2E-DEL-${randomSuffix}`;
    const testEmail = `e2e-del-${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // 1. Crear un socio real en PostgreSQL (FK requerida por discipline)
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: 'Socio E2E Delete',
                dni: testDni,
                email: testEmail,
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });
        const memberBody = JSON.parse(memberResponse.payload);
        testMemberId = memberBody.data.id;

        // 2. Crear una sanción real que luego eliminaremos
        const disciplineResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload: {
                motivo: 'Sanción a eliminar en E2E',
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
        // La discipline ya fue eliminada por el test; solo limpiar el member
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe eliminar la sanción de PostgreSQL y retornar 204', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/disciplines/${testDisciplineId}`,
        });

        expect(response.statusCode).toBe(204);
        expect(response.payload).toBe('');

        // Verificación E2E: confirmar que el registro ya no existe en la BD
        const dbRecord = await prisma.discipline.findUnique({
            where: { id: testDisciplineId },
        });
        expect(dbRecord).toBeNull();
    });
});
