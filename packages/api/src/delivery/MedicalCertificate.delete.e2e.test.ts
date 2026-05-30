import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('MedicalCertificate Delete API End-to-End Test', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let testCertificateId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2E-MED-${randomSuffix}`;
    const testEmail = `e2e-med-${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // 1. Crear un socio real en PostgreSQL (FK requerida por el certificado médico)
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: 'Socio E2E MedCert',
                dni: testDni,
                email: testEmail,
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });
        const memberBody = JSON.parse(memberResponse.payload);
        testMemberId = memberBody.data.id;

        // 2. Crear un certificado médico real que luego se elimina
        const certificateResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/medical_certificates',
            payload: {
                licencia_doctor: '92/18291',
                fecha_emision: '2026-06-01',
                fecha_vencimiento: '2027-07-01',
                member_id: testMemberId,
            },
        });
        const certificateBody = JSON.parse(certificateResponse.payload);
        testCertificateId = certificateBody.data.id;
    });

    afterAll(async () => {
        // Limpieza preventiva por si el test llega a fallar a mitad de camino
        if (testCertificateId) {
            await prisma.medicalCertificate.deleteMany({ where: { id: testCertificateId } }).catch(() => {});
        }
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe eliminar el certificado médico de PostgreSQL y retornar 204', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/medical_certificates/${testCertificateId}`,
        });

        expect(response.statusCode).toBe(204);
        expect(response.payload).toBe('');

        // Verificación E2E: confirmar que el registro ya no existe en la base de datos real
        const dbRecord = await prisma.medicalCertificate.findUnique({
            where: { id: testCertificateId },
        });
        expect(dbRecord).toBeNull();
    });
});