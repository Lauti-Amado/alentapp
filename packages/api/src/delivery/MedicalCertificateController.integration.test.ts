import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

// Mock de PostgresMedicalCertificateRepository aislando la base de datos real
vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => {
    return {
        PostgresMedicalCertificateRepository: class {
            async create(data: any) {
                return {
                    id: 'uuid-medcer-integration',
                    fecha_emision: data.fecha_emision,
                    fecha_vencimiento: data.fecha_vencimiento,
                    esta_validada: true,
                    licencia_doctor: data.licencia_doctor,
                    member_id: data.member_id,
                };
            }

            async darDeBajaCertificadoPorSocio(member_id: string, fecha_vencimiento: string) {
                return;
            }

            async findById(id: string) {
                if (id === '00000000-0000-0000-0000-000000000000') {
                    return null;
                }
                return {
                    id: '11111111-1111-1111-1111-111111111111',
                    licencia_doctor: '19/28190',
                    fecha_emision: '2026-06-01',
                    fecha_vencimiento: '2027-07-01',
                    esta_validada: true,
                    member_id: 'uuid-member-1',
                };
            }

            // Clave para que el Test 5 no tire un TypeError (500)
            async update(id: string, data: any) {
                return {
                    id: id,
                    licencia_doctor: data.licencia_doctor ?? '19/28190',
                    fecha_emision: data.fecha_emision ?? '2026-06-01',
                    fecha_vencimiento: data.fecha_vencimiento ?? '2027-07-01',
                    esta_validada: data.esta_validada ?? true,
                    member_id: 'uuid-member-1',
                };
            }

            async delete(id: string) { return; }

            async darDeAltaCertificadoPorSocio(member_id: string) {
                return;
            }
        },
    };
});

// Mock de PostgresMemberRepository
vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                const members: Record<string, any> = {
                    'uuid-member-1': {
                        id: 'uuid-member-1',
                        name: 'Juan Perez',
                        dni: '12345678',
                        email: 'juan@test.com',
                        birthdate: '1990-01-01',
                        category: 'Pleno',
                        status: 'Activo',
                        created_at: '2026-01-01T00:00:00.000Z',
                    },
                };
                return members[id] ?? null;
            }
        },
    };
});

describe('MedicalCertificate API Integration Tests', () => {
    let app: FastifyInstance;

    const validPayload: CreateMedicalCertificateRequest = {
        licencia_doctor: '19/28190',
        fecha_emision: '2026-06-01',
        fecha_vencimiento: '2027-07-01',
        member_id: 'uuid-member-1',
    };

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/medical_certificates', () => {
        it('debe retornar 201 y el DTO del certificado médico creado', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical_certificates',
                payload: validPayload,
            });

            expect(response.statusCode).toBe(201);

            const body = JSON.parse(response.payload);
            expect(body.data.id).toBeDefined();
            expect(body.data.licencia_doctor).toBe(validPayload.licencia_doctor);
            expect(body.data.esta_validada).toBe(true);
            expect(body.data.member_id).toBe(validPayload.member_id);
        });

        it('debe retornar 404 si el socio provisto no existe en el sistema', async () => {
            const payloadInvalido: CreateMedicalCertificateRequest = {
                ...validPayload,
                member_id: 'uuid-socio-inexistente',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/medical_certificates',
                payload: payloadInvalido,
            });

            expect(response.statusCode).toBe(404);

            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });
    });

    describe('DELETE /api/v1/medical_certificates/:id', () => {
        it('debe retornar 204 No Content al eliminar un certificado médico existente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/medical_certificates/11111111-1111-1111-1111-111111111111',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 400 si el certificado médico a eliminar no existe', async () => {
            // El caso de uso de delete asume que si el ID es de ceros lanza error en tu lógica
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/medical_certificates/00000000-0000-0000-0000-000000000000',
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('PUT /api/v1/medical_certificates/:id', () => {
        // TEST 5: Sincronizado con la ruta real y los datos mockeados
        it('debe retornar 200 y el DTO del certificado actualizado', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/medical_certificates/11111111-1111-1111-1111-111111111111',
                payload: { licencia_doctor: '90/183-Modificado' },
            });

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('11111111-1111-1111-1111-111111111111');
            expect(body.data.licencia_doctor).toBe('90/183-Modificado');
        });

        // TEST 6: Simula la inexistencia atrapada por el catch del controlador
        it('debe retornar 404 si el certificado médico no existe', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/medical_certificates/00000000-0000-0000-0000-000000000000',
                payload: { licencia_doctor: 'Nueva-Licencia' },
            });

            expect(response.statusCode).toBe(404);

            const body = JSON.parse(response.payload);
            expect(body.error).toContain('inexistencia');
        });
    });
});