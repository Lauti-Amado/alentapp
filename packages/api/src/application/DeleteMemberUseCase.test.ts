import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMemberUseCase } from './DeleteMemberUseCase.js';
import { MemberRepository } from '../domain/MemberRepository.js';

describe('DeleteMemberUseCase', () => {
    const mockMemberRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as MemberRepository;

    const useCase = new DeleteMemberUseCase(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el miembro no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-999')).rejects.toThrow('El miembro no existe');
        expect(mockMemberRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el miembro si existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'uuid-1' } as any);
        await useCase.execute('uuid-1');
        expect(mockMemberRepo.delete).toHaveBeenCalledWith('uuid-1');
    });
});
