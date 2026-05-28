import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Sport API End-to-End Tests', () => {

    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdSportId: string;

    // Nombre aleatorio para evitar duplicados
    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const sportName = `E2E-Deporte-${randomSuffix}`;

    beforeAll(async () => {

        // Levantamos la app real
        app = buildApp();
        await app.ready();

        // Conexión real a PostgreSQL
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });

        await prisma.$connect();
    }, 30000);

   

    afterAll(async () => {

        // Cleanup de la base de datos
        if (createdSportId) {
            await prisma.sport.deleteMany({
                where: { id: createdSportId }
            });
        }

        await prisma.$disconnect();
        await app.close();
    });

    it('POST: debe crear un deporte en la base de datos real', async () => {

        const payload = {
            Nombre: sportName,
            Cupo_maximo: 25,
            Precio_adicional: 1500,
            Descripcion: 'Deporte creado desde E2E',
            Require_certificado_medico: true
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/sports',
            payload
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);

        // Verificamos respuesta HTTP
        expect(body.data.id).toBeDefined();
        expect(body.data.Nombre).toBe(sportName);

        // Guardamos ID para limpiar luego
        createdSportId = body.data.id;

        // Verificamos que realmente exista en PostgreSQL
        const dbSport = await prisma.sport.findUnique({
            where: { id: createdSportId }
        });

        expect(dbSport).not.toBeNull();
        expect(dbSport?.Nombre).toBe(sportName);
    });
});