import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Member API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    
    // Generamos un sufijo aleatorio para que los datos insertados
    // no colisionen con los datos de desarrollo existentes.
    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2E${randomSuffix}`;
    const testEmail = `e2e${randomSuffix}@test.com`;

    beforeAll(async () => {
        // 1. Levantamos la app entera (incluyendo PostgreSQL via el Repositorio original)
        app = buildApp();
        await app.ready();
        
        // 2. Instanciamos Prisma independientemente para comprobar la Base de Datos
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();
    });

    afterAll(async () => {
        // Limpiamos la base de datos (Tear down) eliminando el registro si quedó vivo
        if (createdMemberId) {
            await prisma.member.deleteMany({
                where: { id: createdMemberId }
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('1. GET: Debe retornar la lista de socios existente', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/socios'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. POST: Debe crear un socio en la base de datos real', async () => {
        const payload = {
            name: 'Socio E2E',
            dni: testDni,
            email: testEmail,
            birthdate: '2000-01-01',
            category: 'Pleno'
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        
        expect(body.data.id).toBeDefined();
        expect(body.data.name).toBe('Socio E2E');
        
        // Guardamos el ID para usarlo en los siguientes tests y poder limpiar la DB luego
        createdMemberId = body.data.id;
        
        // Verificación directa E2E: ¿Se guardó realmente en PostgreSQL?
        const dbMember = await prisma.member.findUnique({ where: { id: createdMemberId } });
        expect(dbMember).not.toBeNull();
        expect(dbMember?.email).toBe(testEmail);
    });

    it('3. POST: Debe fallar al crear si el DNI ya está persistido en la DB real', async () => {
        const payload = {
            name: 'Clon',
            dni: testDni, // Mismo DNI que el anterior
            email: 'clon@test.com',
            birthdate: '2000-01-01',
            category: 'Pleno'
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('Ya existe un miembro con ese DNI');
    });

    it('4. PUT: Debe actualizar el socio modificando la base de datos', async () => {
        const updatePayload = {
            name: 'Socio E2E Modificado'
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/socios/${createdMemberId}`,
            payload: updatePayload
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.name).toBe('Socio E2E Modificado');

        // Verificar directamente en PostgreSQL que el campo se modificó
        const dbMember = await prisma.member.findUnique({ where: { id: createdMemberId } });
        expect(dbMember?.name).toBe('Socio E2E Modificado');
    });

    it('5. DELETE: Debe eliminar físicamente al socio de la base de datos', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/socios/${createdMemberId}`
        });

        expect(response.statusCode).toBe(204);

        // Verificar que Prisma ya no lo encuentra en la DB Real
        const dbMember = await prisma.member.findUnique({ where: { id: createdMemberId } });
        expect(dbMember).toBeNull();
        
        // Anular variable para que afterAll no intente borrarlo nuevamente
        createdMemberId = '';
    });
});
