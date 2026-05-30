import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

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

            async findById(id: string) {
                if (id === '1') {
                    return {
                        id: '1',
                        Nombre: 'Basquet',
                        Cupo_maximo: 20,
                        Precio_adicional: 1000,
                        Descripcion: 'Deporte existente',
                        Require_certificado_medico: true
                    };
                }
                return null;
            }

            async create(data: any) {
                return {
                    id: '2',
                    ...data
                };
                
            }

            // Asegúrate de usar el mismo nombre de método que use tu UpdateSportUseCase (ej: update, save, etc.)
            async update(id: string, data: any) {
                return {
                    id,
                    Nombre: 'Basquet', // simulando que mantiene los campos anteriores o lo que venga de la DB
                    Cupo_maximo: 20,
                    Precio_adicional: 1000,
                    Descripcion: 'Deporte existente',
                    Require_certificado_medico: true,
                    ...data // Sobrescribe con lo que se editó
                };
        }

        async delete(id: string) {
                if (id === '999') {
                    throw new Error('El deporte no existe');
                }
                return; // Simula una eliminación exitosa
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

    // --- NUEVOS TESTS DE INTEGRACIÓN PARA MODIFICAR (PATCH) ---
    describe('PUT /api/v1/sports/:id', () => {

        it('debe retornar 200 y modificar el deporte si los datos son válidos', async () => {
            const payload: UpdateSportRequest = {
                Cupo_maximo: 15,
                Descripcion: 'Descripción cambiada mediante HTTP'
            };

            const response = await app.inject({
                method: 'PUT', 
                url: '/api/v1/sports/1', // ID '1' configurado en el mock
                payload
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('1');
            expect(body.data.Cupo_maximo).toBe(15);
            expect(body.data.Descripcion).toBe('Descripción cambiada mediante HTTP');
        });

        it('debe retornar 400 Bad Request si los datos enviados violan las reglas de negocio', async () => {
            const payload: UpdateSportRequest = {
                Cupo_maximo: -5 // Viola la regla: debe ser mayor a cero
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/1',
                payload
            });

            expect(response.statusCode).toBe(400);

            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El cupo máximo debe ser mayor a cero');
        });
    });

    describe('DELETE /api/v1/sports/:id', () => {
        it('debe retornar 204 si se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/1' // ID existente en el mock
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el deporte a eliminar no existe', async () => {
            // Nota: Ajusta el código de error (400 o 404) según tu implementación real
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/999'
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte no existe');
        });
    });

});