import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { buildApp } from '../app.js';
import { randomUUID } from 'node:crypto';

type CreatePaymentRequest = {
    member_id: string;
    monto: number;
    mes: number;
    anio: number;
    fecha_vencimiento: string;
};

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    const createdMemberIds: string[] = [];

    const createTestMember = async (): Promise<{ id: string }> => {
        const id = randomUUID();
        const uniqueValue = randomUUID();

        const member = await prisma.member.create({
            data: {
                id,
                dni: `payment-test-${uniqueValue}`,
                name: 'Socio Integracion Payment',
                email: `payment-integration-${uniqueValue}@test.com`,
                category: 'Pleno',
            },
            select: {
                id: true,
            },
        });

        createdMemberIds.push(member.id);
        return member;
    };

    const createTestPayment = async (estado: 'Pendiente' | 'Cancelado' = 'Pendiente') => {
        const member = await createTestMember();

        return prisma.payment.create({
            data: {
                member_id: member.id,
                monto: 15000,
                mes: 5,
                anio: 2026,
                fecha_vencimiento: new Date('2026-05-10T00:00:00.000Z'),
                estado,
            },
        });
    };

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as string),
        });
        await prisma.$connect();
    });

    afterEach(async () => {
        if (createdMemberIds.length > 0) {
            await prisma.payment.deleteMany({
                where: { member_id: { in: createdMemberIds } },
            });
            await prisma.member.deleteMany({
                where: { id: { in: createdMemberIds } },
            });
            createdMemberIds.length = 0;
        }
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    describe('POST /api/v1/pagos', () => {
        it('debe crear un Payment asociado a un Member existente usando API y base de datos de test', async () => {
            const member = await createTestMember();
            const payload: CreatePaymentRequest = {
                member_id: member.id,
                monto: 15000,
                mes: 5,
                anio: 2026,
                fecha_vencimiento: '2026-05-10',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/pagos',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data).toEqual(expect.objectContaining({
                id: expect.any(String),
                member_id: member.id,
                monto: 15000,
                mes: 5,
                anio: 2026,
                fecha_vencimiento: '2026-05-10',
                estado: 'Pendiente',
                fecha_pago: null,
                deleted_at: null,
            }));

            const dbPayment = await prisma.payment.findUnique({
                where: { id: body.data.id },
            });
            expect(dbPayment).not.toBeNull();
            expect(dbPayment?.member_id).toBe(member.id);
            expect(dbPayment?.estado).toBe('Pendiente');
            expect(dbPayment?.fecha_pago).toBeNull();
            expect(dbPayment?.deleted_at).toBeNull();
        });

        it('debe retornar 400 si el member_id no existe', async () => {
            const payload: CreatePaymentRequest = {
                member_id: randomUUID(),
                monto: 15000,
                mes: 5,
                anio: 2026,
                fecha_vencimiento: '2026-05-10',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/pagos',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El miembro no existe');
        });
    });

    describe('PUT /api/v1/pagos/:id', () => {
        it('debe modificar un Payment existente usando API y base de datos de test', async () => {
            const payment = await createTestPayment();
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/pagos/${payment.id}`,
                payload: {
                    monto: 18000,
                    mes: 6,
                    anio: 2026,
                    fecha_vencimiento: '2026-06-10',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toEqual(expect.objectContaining({
                id: payment.id,
                monto: 18000,
                mes: 6,
                anio: 2026,
                fecha_vencimiento: '2026-06-10',
                estado: 'Pendiente',
            }));

            const dbPayment = await prisma.payment.findUnique({
                where: { id: payment.id },
            });
            expect(dbPayment?.monto).toBe(18000);
            expect(dbPayment?.mes).toBe(6);
            expect(dbPayment?.anio).toBe(2026);
            expect(dbPayment?.fecha_vencimiento.toISOString().split('T')[0]).toBe('2026-06-10');
        });

        it('debe retornar 409 si intenta modificar un Payment cancelado', async () => {
            const payment = await createTestPayment('Cancelado');
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/pagos/${payment.id}`,
                payload: {
                    monto: 18000,
                },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('No se puede modificar un pago cancelado');
        });
    });
});
