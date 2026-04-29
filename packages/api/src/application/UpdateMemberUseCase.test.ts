import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMemberUseCase } from './UpdateMemberUseCase.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberValidator } from '../domain/services/MemberValidator.js';
import { UpdateMemberRequest, MemberDTO } from '@alentapp/shared';

describe('UpdateMemberUseCase', () => {
    const mockMemberRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as MemberRepository;

    const mockMemberValidator = {
        validateEmail: vi.fn(),
        validateDniIsUnique: vi.fn(),
        isMinor: vi.fn(),
    } as unknown as MemberValidator;

    const useCase = new UpdateMemberUseCase(mockMemberRepo, mockMemberValidator);

    const mockExistingMember: MemberDTO = {
        id: 'uuid-1',
        dni: '12345678',
        name: 'Original Name',
        email: 'original@test.com',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: '2026-04-20T00:00:00.000Z'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockMemberRepo.findById).mockResolvedValue(mockExistingMember);
    });

    it('debe lanzar error si el miembro no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-no', {})).rejects.toThrow('El miembro no existe');
    });

    it('debe validar email y dni si son enviados y distintos', async () => {
        const updateData: UpdateMemberRequest = { email: 'new@test.com', dni: '87654321' };
        vi.mocked(mockMemberRepo.update).mockResolvedValueOnce({ ...mockExistingMember, ...updateData });
        
        await useCase.execute('uuid-1', updateData);
        
        expect(mockMemberValidator.validateEmail).toHaveBeenCalledWith('new@test.com');
        expect(mockMemberValidator.validateDniIsUnique).toHaveBeenCalledWith('87654321', 'uuid-1');
    });

    it('NO debe validar dni si es enviado pero es igual al original', async () => {
        const updateData: UpdateMemberRequest = { dni: '12345678' };
        vi.mocked(mockMemberRepo.update).mockResolvedValueOnce({ ...mockExistingMember });
        
        await useCase.execute('uuid-1', updateData);
        
        expect(mockMemberValidator.validateDniIsUnique).not.toHaveBeenCalled();
    });

    it('debe forzar categoría Cadete si se actualiza fecha y es menor', async () => {
        const updateData: UpdateMemberRequest = { birthdate: '2015-01-01', category: 'Pleno' };
        vi.mocked(mockMemberValidator.isMinor).mockReturnValueOnce(true);
        vi.mocked(mockMemberRepo.update).mockResolvedValueOnce({ ...mockExistingMember, category: 'Cadete', birthdate: '2015-01-01' });
        
        await useCase.execute('uuid-1', updateData);
        
        expect(mockMemberRepo.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
            category: 'Cadete'
        }));
    });
});
