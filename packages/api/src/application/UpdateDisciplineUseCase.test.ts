import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateDisciplineUseCase } from './UpdateDisciplineUseCase.js';
import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

describe('UpdateDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        update: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockValidator = {
        validateDisciplineExists: vi.fn(),
        validateDateRangeForUpdate: vi.fn(),
        validateLevantamiento: vi.fn(),
    } as unknown as DisciplineValidator;

    const useCase = new UpdateDisciplineUseCase(mockDisciplineRepo, mockValidator);

    const existingDTO: DisciplineDTO = {
        id: 'uuid-disc-1',
        motivo: 'Conducta inapropiada en instalaciones',
        fechaInicio: '2026-06-01',
        fechaFin: '2026-07-01',
        esSuspensionTotal: false,
        memberId: 'uuid-member-1',
        motivoLevantamiento: null,
    };

    const updatePayload: UpdateDisciplineRequest = {
        motivo: 'Motivo actualizado',
        motivoLevantamiento: null,
    };

    const updatedDTO: DisciplineDTO = {
        ...existingDTO,
        motivo: 'Motivo actualizado',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe actualizar la sanción delegando todas las validaciones en el validator y retornar el DTO actualizado', async () => {
        vi.mocked(mockValidator.validateDisciplineExists).mockResolvedValueOnce(existingDTO);
        vi.mocked(mockDisciplineRepo.update).mockResolvedValueOnce(updatedDTO);

        const result = await useCase.execute('uuid-disc-1', updatePayload);

        expect(mockValidator.validateDisciplineExists).toHaveBeenCalledWith('uuid-disc-1');
        expect(mockValidator.validateDateRangeForUpdate).toHaveBeenCalledWith(updatePayload, existingDTO);
        expect(mockValidator.validateLevantamiento).toHaveBeenCalledWith(
            existingDTO,
            updatePayload.motivoLevantamiento,
        );
        expect(mockDisciplineRepo.update).toHaveBeenCalledWith('uuid-disc-1', updatePayload);
        expect(result.motivo).toBe('Motivo actualizado');
        expect(result.id).toBe('uuid-disc-1');
    });
});
