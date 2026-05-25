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

    describe('validateMemberExists', () => {
        it('debe lanzar error si el socio no existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberExists('uuid-inexistente')).rejects.toThrow(
                'El socio provisto no existe',
            );
            expect(mockMemberRepo.findById).toHaveBeenCalledWith('uuid-inexistente');
        });
    });

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
});
