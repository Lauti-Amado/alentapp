import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

// Mockeamos PostgresDisciplineRepository completo para aislar la integración de la BD real.
// findActiveTotalSuspensionByMember se comporta diferente según el memberId
// para cubrir el happy path (null) y el caso de conflicto (suspensión activa).
vi.mock('../infrastructure/PostgresDisciplineRepository.js', () => {
    return {
        PostgresDisciplineRepository: class {
            async create(data: any) {
                return {
                    id: 'uuid-disc-integration',
                    motivo: data.motivo,
                    fechaInicio: data.fechaInicio,
                    fechaFin: data.fechaFin,
                    esSuspensionTotal: data.esSuspensionTotal,
                    motivoLevantamiento: data.motivoLevantamiento,
                    memberId: data.memberId,
                };
            }
            async findAll() { return []; }
            async findById() { return null; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete() { return; }
            async findActiveTotalSuspensionByMember(memberId: string) {
                if (memberId === 'uuid-member-with-active-suspension') {
                    return {
                        id: 'disc-existente',
                        motivo: 'Suspensión previa',
                        fechaInicio: '2026-01-01T00:00:00.000Z',
                        fechaFin: '2026-12-31T00:00:00.000Z',
                        esSuspensionTotal: true,
                        motivoLevantamiento: null,
                        memberId: 'uuid-member-with-active-suspension',
                    };
                }
                return null;
            }
        },
    };
});

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
                    'uuid-member-with-active-suspension': {
                        id: 'uuid-member-with-active-suspension',
                        name: 'Pedro Lopez',
                        dni: '99999999',
                        email: 'pedro@test.com',
                        birthdate: '1985-06-15',
                        category: 'Pleno',
                        status: 'Activo',
                        created_at: '2026-01-01T00:00:00.000Z',
                    },
                };
                return members[id] ?? null;
            }
            async findByDni() { return null; }
            async findAll() { return []; }
            async create(data: any) { return { id: 'uuid-member-new', ...data, status: 'Activo' }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete() { return; }
        },
    };
});

describe('Discipline API Integration Tests', () => {
    let app: FastifyInstance;

    const validPayload: CreateDisciplineRequest = {
        motivo: 'Conducta inapropiada en instalaciones',
        fechaInicio: '2026-06-01',
        fechaFin: '2026-07-01',
        esSuspensionTotal: true,
        memberId: 'uuid-member-1',
        motivoLevantamiento: null,
    };

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/disciplines', () => {
        it('debe retornar 201 y el DTO de la sanción creada', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload: validPayload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBeDefined();
            expect(body.data.motivo).toBe(validPayload.motivo);
            expect(body.data.esSuspensionTotal).toBe(true);
            expect(body.data.memberId).toBe(validPayload.memberId);
        });

        it('debe retornar 409 si el socio ya tiene una suspensión total vigente', async () => {
            const payloadConConflicto: CreateDisciplineRequest = {
                ...validPayload,
                memberId: 'uuid-member-with-active-suspension',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload: payloadConConflicto,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Pedro Lopez');
            expect(body.error).toContain('suspensión total vigente');
        });
    });
});
