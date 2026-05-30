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

    it('PUT: Debe actualizar el deporte modificando la base de datos', async () => {
        const updatePayload = {
            Cupo_maximo: 26,
            Descripcion: 'Descripción actualizada desde test E2E'
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/sports/${createdSportId}`,
            payload: updatePayload
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        
        // Verificamos que la respuesta devuelva los datos modificados
        expect(body.data.Cupo_maximo).toBe(26);
        expect(body.data.Descripcion).toBe('Descripción actualizada desde test E2E');
        // El nombre debe seguir siendo el original (no cambia)
        expect(body.data.Nombre).toBe(sportName);

        // Verificar directamente en PostgreSQL que los cambios persistieron
        const dbSport = await prisma.sport.findUnique({ 
            where: { id: createdSportId } 
        });
        expect(dbSport).not.toBeNull();
        expect(dbSport?.Cupo_maximo).toBe(26);
        expect(dbSport?.Descripcion).toBe('Descripción actualizada desde test E2E');
        expect(dbSport?.Nombre).toBe(sportName);
    });

    it('DELETE: Debe eliminar físicamente el deporte de la base de datos', async () => {
        // Aseguramos que el deporte existe antes de borrarlo
        expect(createdSportId).toBeDefined();

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/sports/${createdSportId}`
        });

        expect(response.statusCode).toBe(204);

        // Verificar directamente en PostgreSQL que el registro desapareció
        const dbSport = await prisma.sport.findUnique({ 
            where: { id: createdSportId } 
        });
        
        expect(dbSport).toBeNull();
        
        // Limpiamos la variable para que el afterAll no intente borrarlo otra vez
        createdSportId = '';
    });
});