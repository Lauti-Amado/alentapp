import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';

describe('Medical Certificate Update API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let testCertificateId: string;

    // Sufijo aleatorio para evitar colisiones con datos de otros tests concurrentes
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

        // Crea un socio real en PostgreSQL (Requerido por la FK member_id)
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: 'Socio E2E Update Cert',
                dni: testDni,
                email: testEmail,
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });
        const memberBody = JSON.parse(memberResponse.payload);
        testMemberId = memberBody.data.id;

        // Crea un certificado médico real que luego se actualizará
        const certificateResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/medical_certificates',
            payload: {
                licencia_doctor: '12/3456-ORIGINAL',
                fecha_emision: '2026-06-01',
                fecha_vencimiento: '2027-06-01',
                member_id: testMemberId,
            },
        });
        const certificateBody = JSON.parse(certificateResponse.payload);
        testCertificateId = certificateBody.data.id;
    });

    afterAll(async () => {
        if (testCertificateId) {
            await prisma.medicalCertificate.deleteMany({ where: { id: testCertificateId } });
        }
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe persistir la actualización del certificado en PostgreSQL y retornar 200', async () => {
        const payload: UpdateMedicalCertificateRequest = {
            licencia_doctor: '99/8888-MODIFICADA_E2E',
            esta_validada: true,
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/medical_certificates/${testCertificateId}`,
            payload,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBe(testCertificateId);
        expect(body.data.licencia_doctor).toBe('99/8888-MODIFICADA_E2E');
        expect(body.data.esta_validada).toBe(true);

        const record = await prisma.medicalCertificate.findUnique({ where: { id: testCertificateId } });
        
        expect(record).not.toBeNull();
        expect(record!.licencia_doctor).toBe('99/8888-MODIFICADA_E2E');
        expect(record!.esta_validada).toBe(true);
    });
});