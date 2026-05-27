import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest } from '@alentapp/shared';

// Mockeamos el repositorio para evitar usar la DB real
// Esto permite testear la integración:
// Fastify -> Controller -> UseCase
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    return {
        PostgresSportRepository: class {

            async findAll() {
                return [
                    {
                        id: '1',
                        Nombre: 'Basquet',
                        Cupo_maximo: 20,
                        Precio_adicional: 1000,
                        Descripcion: 'Deporte existente',
                        Require_certificado_medico: true
                    }
                ];
            }

            async create(data: any) {
                return {
                    id: '2',
                    ...data
                };
            }
        }
    };
});

describe('Sport API Integration Tests', () => {

    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/sports', () => {

        it('debe retornar 201 y crear el deporte correctamente', async () => {

            const payload: CreateSportRequest = {
                Nombre: 'Futbol',
                Cupo_maximo: 30,
                Precio_adicional: 1500,
                Descripcion: 'Deporte grupal',
                Require_certificado_medico: true
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload
            });

            expect(response.statusCode).toBe(201);

            const body = JSON.parse(response.payload);

            expect(body.data.Nombre).toBe('Futbol');
            expect(body.data.id).toBeDefined();
        });

        it('debe retornar 409 si el deporte ya existe', async () => {

            const payload: CreateSportRequest = {
                Nombre: 'Basquet', // Ya existe en el mock
                Cupo_maximo: 20,
                Precio_adicional: 1000,
                Descripcion: 'Duplicado',
                Require_certificado_medico: true
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload
            });

            expect(response.statusCode).toBe(409);

            const body = JSON.parse(response.payload);

            expect(body.error).toBe(
                'Ya existe un deporte con ese nombre'
            );
        });
    });
});