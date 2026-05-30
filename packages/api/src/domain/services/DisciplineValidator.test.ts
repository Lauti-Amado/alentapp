import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisciplineValidator } from './DisciplineValidator.js';
import { IDisciplineRepository } from '../DisciplineRepository.js';
import { MemberRepository } from '../MemberRepository.js';

describe('DisciplineValidator', () => {
    const mockDisciplineRepo = {
        findById: vi.fn(),
        findActiveTotalSuspensionByMember: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new DisciplineValidator(mockDisciplineRepo, mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // UT-1 (flujo de creación)
    describe('validateDateRange', () => {
        it('debe lanzar error si fechaFin no es posterior a fechaInicio', () => {
            // fechaFin anterior a fechaInicio
            expect(() => validator.validateDateRange('2026-07-01', '2026-06-01')).toThrow(
                'La fecha de fin debe ser posterior a la de inicio',
            );
            // fechaFin igual a fechaInicio
            expect(() => validator.validateDateRange('2026-06-01', '2026-06-01')).toThrow(
                'La fecha de fin debe ser posterior a la de inicio',
            );
        });
    });

    // UT-2 (flujo de creación)
    describe('validateMemberExists', () => {
        it('debe lanzar error si el socio no existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberExists('uuid-inexistente')).rejects.toThrow(
                'El socio provisto no existe',
            );
            expect(mockMemberRepo.findById).toHaveBeenCalledWith('uuid-inexistente');
        });
    });

    // UT-3 (flujo de creación)
    describe('validateNoActiveTotalSuspension', () => {
        it('debe lanzar error si el socio ya tiene una suspensión total vigente', async () => {
            vi.mocked(mockDisciplineRepo.findActiveTotalSuspensionByMember).mockResolvedValueOnce({
                id: 'disc-existente',
                motivo: 'Suspensión previa',
                fechaInicio: '2026-01-01T00:00:00.000Z',
                fechaFin: '2026-12-31T00:00:00.000Z',
                esSuspensionTotal: true,
                motivoLevantamiento: null,
                memberId: 'uuid-1',
            });

            await expect(
                validator.validateNoActiveTotalSuspension('uuid-1', 'Juan Perez', '12345678'),
            ).rejects.toThrow(
                'El socio Juan Perez - DNI: 12345678 ya cuenta con una suspensión total vigente',
            );
            expect(mockDisciplineRepo.findActiveTotalSuspensionByMember).toHaveBeenCalledWith('uuid-1');
        });
    });

    // UT-5 (flujo de actualización)
    describe('validateDisciplineExists', () => {
        it('debe lanzar error si la sanción no existe', async () => {
            vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateDisciplineExists('uuid-inexistente')).rejects.toThrow(
                'El registro de sanción no existe',
            );
            expect(mockDisciplineRepo.findById).toHaveBeenCalledWith('uuid-inexistente');
        });
    });

    // UT-6 (flujo de actualización)
    describe('validateDateRangeForUpdate', () => {
        it('debe lanzar error con update parcial cuando fechaFin es anterior al fechaInicio existente', () => {
            const existing = {
                id: 'uuid-disc-1',
                motivo: 'Sanción existente',
                fechaInicio: '2026-06-01',
                fechaFin: '2026-07-01',
                esSuspensionTotal: false,
                memberId: 'uuid-member-1',
                motivoLevantamiento: null,
            };

            // Solo se envía fechaFin; fechaInicio usa el fallback del registro existente (2026-06-01).
            // El nuevo fechaFin (2026-01-01) es anterior al fechaInicio existente → rango inválido.
            expect(() =>
                validator.validateDateRangeForUpdate({ fechaFin: '2026-01-01' }, existing),
            ).toThrow('Error al modificar la sanción. El rango de fechas introducido es inválido');
        });
    });

    // UT-7 (flujo de actualización)
    describe('validateLevantamiento', () => {
        it('debe lanzar error al intentar levantar una sanción que ya caducó', () => {
            const existingCaducada = {
                id: 'uuid-disc-caducada',
                motivo: 'Sanción caducada',
                fechaInicio: '2019-01-01',
                fechaFin: '2020-01-01', // en el pasado → caducada
                esSuspensionTotal: false,
                memberId: 'uuid-member-1',
                motivoLevantamiento: null, // aún no levantada
            };

            expect(() =>
                validator.validateLevantamiento(existingCaducada, 'Cumplió la sanción'),
            ).toThrow('No se puede levantar una sanción que ya ha caducado');
        });
    });

    // UT-9 (flujo de eliminación)
    describe('validateDisciplineExists (happy path)', () => {
        it('debe retornar el DTO de la sanción cuando existe', async () => {
            const disciplineFixture = {
                id: 'uuid-disc-existente',
                motivo: 'Conducta inapropiada',
                fechaInicio: '2026-06-01T00:00:00.000Z',
                fechaFin: '2026-07-01T00:00:00.000Z',
                esSuspensionTotal: false,
                memberId: 'uuid-member-1',
                motivoLevantamiento: null,
            };

            vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(disciplineFixture);

            const result = await validator.validateDisciplineExists('uuid-disc-existente');

            expect(result).toEqual(disciplineFixture);
            expect(mockDisciplineRepo.findById).toHaveBeenCalledWith('uuid-disc-existente');
        });
    });

    // UT-10 (flujo de eliminación)
    describe('validateDisciplineExists (sad path)', () => {
        it('debe lanzar error si la sanción no existe', async () => {
            vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateDisciplineExists('uuid-inexistente')).rejects.toThrow(
                'El registro de sanción no existe',
            );
            expect(mockDisciplineRepo.findById).toHaveBeenCalledWith('uuid-inexistente');
        });
    });
});
