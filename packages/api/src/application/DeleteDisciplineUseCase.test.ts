import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteDisciplineUseCase } from './DeleteDisciplineUseCase.js';
import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { DisciplineDTO } from '@alentapp/shared';

describe('DeleteDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        delete: vi.fn(),
    } as unknown as IDisciplineRepository;

    const mockValidator = {
        validateDisciplineExists: vi.fn(),
    } as unknown as DisciplineValidator;

    const useCase = new DeleteDisciplineUseCase(mockDisciplineRepo, mockValidator);

    const existingDTO: DisciplineDTO = {
        id: 'uuid-disc-1',
        motivo: 'Conducta inapropiada en instalaciones',
        fechaInicio: '2026-06-01',
        fechaFin: '2026-07-01',
        esSuspensionTotal: false,
        memberId: 'uuid-member-1',
        motivoLevantamiento: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // UT-11 (flujo de eliminación)
    it('debe validar la existencia y delegar la eliminación al repositorio', async () => {
        vi.mocked(mockValidator.validateDisciplineExists).mockResolvedValueOnce(existingDTO);
        vi.mocked(mockDisciplineRepo.delete).mockResolvedValueOnce(undefined);

        await useCase.execute('uuid-disc-1');

        expect(mockValidator.validateDisciplineExists).toHaveBeenCalledWith('uuid-disc-1');
        expect(mockDisciplineRepo.delete).toHaveBeenCalledWith('uuid-disc-1');
        expect(mockDisciplineRepo.delete).toHaveBeenCalledTimes(1);
    });

    // UT-12 (flujo de eliminación)
    it('no debe llamar a repo.delete si validateDisciplineExists lanza error', async () => {
        vi.mocked(mockValidator.validateDisciplineExists).mockRejectedValueOnce(
            new Error('El registro de sanción no existe'),
        );

        await expect(useCase.execute('uuid-inexistente')).rejects.toThrow(
            'El registro de sanción no existe',
        );

        expect(mockDisciplineRepo.delete).not.toHaveBeenCalled();
    });
});
