import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

describe('Medical Certificate API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let createdCertificateId: string;
    let previousCertificateId: string;

    // Sufijo aleatorio para evitar colisiones en la base de datos de pruebas
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

        // Crear un socio real en PostgreSQL para usar su ID como FK
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: 'Socio E2E Medical',
                dni: testDni,
                email: testEmail,
                birthdate: '2004-07-10',
                category: 'Pleno',
            },
        });
        
        const memberBody = JSON.parse(memberResponse.payload);
        testMemberId = memberBody.data.id; 

        // Creamos el certificado anterior para este miembro específico en la DB
        const previousCertificate = await prisma.medicalCertificate.create({
            data: {
                member_id: testMemberId,
                fecha_emision: new Date('2026-01-01T00:00:00.000Z'),
                fecha_vencimiento: new Date('2026-05-01T00:00:00.000Z'),
                licencia_doctor: '11/2222',
                esta_validada: true
            }
        });
        previousCertificateId = previousCertificate.id;
    });

    afterAll(async () => {
        if (previousCertificateId) {
            await prisma.medicalCertificate.deleteMany({ where: { id: previousCertificateId } });
        }
        if (createdCertificateId) {
            await prisma.medicalCertificate.deleteMany({ where: { id: createdCertificateId } });
        }
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('debe persistir el certificado médico en PostgreSQL, ejecutar reglas de negocio y retornar 201', async () => {
        const payload: CreateMedicalCertificateRequest = {
            member_id: testMemberId,
            fecha_emision: '2026-06-01',
            fecha_vencimiento: '2026-07-01',
            licencia_doctor: '81/131'
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medical_certificates',
            payload,
        });

        expect(response.statusCode).toBe(201);
        
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBeDefined();
        expect(body.data.licencia_doctor).toBe(payload.licencia_doctor);
        expect(body.data.member_id).toBe(testMemberId);

        createdCertificateId = body.data.id;

        const dbCertificate = await prisma.medicalCertificate.findUnique({ 
            where: { id: createdCertificateId } 
        });

        expect(dbCertificate).not.toBeNull();
        expect(dbCertificate?.licencia_doctor).toBe('81/131');
        expect(dbCertificate?.member_id).toBe(testMemberId);
        
        const updatedPreviousCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: previousCertificateId }
        });
        expect(updatedPreviousCertificate?.esta_validada).toBe(false);
    });
});