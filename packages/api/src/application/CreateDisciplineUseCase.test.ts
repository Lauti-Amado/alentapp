import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateDisciplineUseCase } from './CreateDisciplineUseCase.js';
import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { CreateDisciplineRequest, DisciplineDTO, MemberDTO } from '@alentapp/shared';

describe('CreateDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        create: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockValidator = {
        validateDateRange: vi.fn(),
        validateMemberExists: vi.fn(),
        validateNoActiveTotalSuspension: vi.fn(),
    } as unknown as DisciplineValidator;

    const useCase = new CreateDisciplineUseCase(mockDisciplineRepo, mockValidator);

    const validPayload: CreateDisciplineRequest = {
        motivo: 'Conducta inapropiada en instalaciones',
        fechaInicio: '2026-06-01',
        fechaFin: '2026-07-01',
        esSuspensionTotal: true,
        memberId: 'uuid-member-1',
        motivoLevantamiento: null,
    };

    const mockMember: MemberDTO = {
        id: 'uuid-member-1',
        name: 'Juan Perez',
        dni: '12345678',
        email: 'juan@test.com',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: '2026-01-01T00:00:00.000Z',
    };

    const mockDisciplineDTO: DisciplineDTO = {
        id: 'uuid-disc-1',
        ...validPayload,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear la sanción delegando todas las validaciones en el validator y retornar el DTO', async () => {
        vi.mocked(mockValidator.validateMemberExists).mockResolvedValueOnce(mockMember);
        vi.mocked(mockDisciplineRepo.create).mockResolvedValueOnce(mockDisciplineDTO);

        const result = await useCase.execute(validPayload);

        expect(mockValidator.validateDateRange).toHaveBeenCalledWith(
            validPayload.fechaInicio,
            validPayload.fechaFin,
        );
        expect(mockValidator.validateMemberExists).toHaveBeenCalledWith(validPayload.memberId);
        expect(mockValidator.validateNoActiveTotalSuspension).toHaveBeenCalledWith(
            validPayload.memberId,
            mockMember.name,
            mockMember.dni,
        );
        expect(mockDisciplineRepo.create).toHaveBeenCalledWith(validPayload);
        expect(result.id).toBe('uuid-disc-1');
        expect(result.motivo).toBe(validPayload.motivo);
    });
});
