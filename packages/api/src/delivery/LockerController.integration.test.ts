import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateLockerRequest } from '@alentapp/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Mockeamos PostgresLockerRepository para que la API entera funcione sin DB real.
// Esto testea el ciclo completo: Fastify -> Controller -> UseCase -> Validator
// sin depender de PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() {
                return [{ id: '1', numero: 11, estado: 'Disponible', ubicacion: 'Vestuario Masculino', member_id: null }];
            }
            async findById(id: string) {
                // Simulamos que el ID '1' existe, el resto no
                return id === '1' ? { id: '1', numero: 11, estado: 'Disponible', ubicacion: 'Vestuario Masculino', member_id: null } : null;
            }
            async findByNumero(numero: number) {
                // Simulamos que el número 11 ya existe, el resto no
                return numero === 11 ? { id: '1', numero: 11, estado: 'Disponible', ubicacion: 'Vestuario Masculino', member_id: null } : null;
            }
            async create(data: any) {
                return { id: '2', estado: 'Disponible', member_id: null, ...data };
            }
            async update(id: string, data: any) {
                return { id, ...data };
            }
            async delete(id: string) {
                return; // Simula un borrado exitoso sin devolver nada
            }
        }
    };
});

describe('Locker API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready(); // Esperamos a que todos los plugins (como CORS) carguen
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/lockers', () => {
        // ─────────────────────────────────────────────────────────────────
        // TEST 1: GET /api/v1/lockers (Camino Feliz - Listado)
        // Verifica que el endpoint retorna 200 y la lista de lockers.
        // Ruta: LockerController.getAll() -> GetLockers -> repo.findAll()
        // ─────────────────────────────────────────────────────────────────
        it('debe retornar código 200 y el listado de lockers', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].numero).toBe(11); 
        });
    });

    describe('POST /api/v1/lockers', () => {
        // ─────────────────────────────────────────────────────────────────
        // TEST 2: POST /api/v1/lockers (Camino Feliz - Creación Exitosa)
        // Verifica que al enviar datos válidos, se crea el locker 
        // forzando el estado a 'Disponible' y member_id nulo.
        // ─────────────────────────────────────────────────────────────────
        it('debe retornar 201 y crear el locker con estado Disponible', async () => {
            const payload: CreateLockerRequest = {
                numero: 22,
                ubicacion: 'Vestuario Femenino',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.numero).toBe(22);
            expect(body.data.estado).toBe('Disponible');
            expect(body.data.member_id).toBeNull();
            expect(body.message).toBe('Locker creado con éxito');
        });

        // ─────────────────────────────────────────────────────────────────
        // TEST 3: POST /api/v1/lockers (Caso de Borde - Número Duplicado)
        // Verifica que el sistema intercepte la creación si el número
        // de locker ya existe en la base de datos (Error 409).
        // ─────────────────────────────────────────────────────────────────
        it('debe atravesar la capa de validación y retornar 409 si el número ya existe', async () => {
            const payload: CreateLockerRequest = {
                numero: 11, // Este número lo mockeamos arriba como existente
                ubicacion: 'Vestuario Masculino',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un locker con ese número');
        });

        // ─────────────────────────────────────────────────────────────────
        // TEST 4: POST /api/v1/lockers (Caso de Borde - Datos Inválidos)
        // Verifica que el LockerValidator ataje errores de formato,
        // como un número negativo o faltante, antes de tocar la DB (Error 400).
        // ─────────────────────────────────────────────────────────────────
        it('debe retornar 400 si el número del locker es inválido', async () => {
            const payload = {
                numero: -1, // Número inválido según LockerValidator
                ubicacion: 'Vestuario Masculino',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('obligatorio'); // toContain por si varía el string de error
        });
    });

    describe('PUT /api/v1/lockers/:id', () => {
        // ─────────────────────────────────────────────────────────────────
        // TEST 5: PUT /api/v1/lockers/:id (Camino Feliz - Actualización)
        // Verifica que si el ID existe, se actualiza y devuelve 200 con los datos.
        // Ruta: LockerController.update() -> UpdateLocker -> repo.findById() -> repo.update()
        // ─────────────────────────────────────────────────────────────────
        it('debe retornar 200 y actualizar la ubicación del locker', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: { ubicacion: 'Vestuario Actualizado' }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.ubicacion).toBe('Vestuario Actualizado');
        });
    });



    describe('DELETE /api/v1/lockers/:id', () => {
        // ─────────────────────────────────────────────────────────────────
        // TEST 6: DELETE /api/v1/lockers/:id (Camino Feliz - Borrado)
        // Verifica que si el ID existe, se elimina y devuelve 204 No Content.
        // Ruta: LockerController.delete() -> DeleteLocker -> repo.findById() -> repo.delete()
        // ─────────────────────────────────────────────────────────────────
        it('debe retornar 204 si el locker se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/1' // El ID 1 existe en nuestro mock (findById)
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe(''); // 204 no devuelve cuerpo
        });

        // ─────────────────────────────────────────────────────────────────
        // TEST 7: DELETE /api/v1/lockers/:id (Caso de Borde - No encontrado)
        // Verifica que si el ID no existe en la DB, devuelve error 404.
        // ─────────────────────────────────────────────────────────────────
        it('debe retornar 404 si el locker a eliminar no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/999' // El ID 999 NO existe en nuestro mock
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El locker solicitado no existe');
        });
    });
});