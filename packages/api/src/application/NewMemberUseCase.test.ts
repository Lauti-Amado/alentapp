import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMemberUseCase } from './NewMemberUseCase.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberValidator } from '../domain/services/MemberValidator.js';
import { CreateMemberRequest } from '@alentapp/shared';

describe('CreateMemberUseCase', () => {
    // 1. Creamos Mocks de nuestras dependencias (Puertos y Servicios)
    const mockMemberRepo = {
        create: vi.fn(),
    } as unknown as MemberRepository;

    const mockMemberValidator = {
        validateEmail: vi.fn(),
        validateDniIsUnique: vi.fn(),
        isMinor: vi.fn(),
    } as unknown as MemberValidator;

    // 2. Instanciamos el caso de uso inyectando los mocks
    const useCase = new CreateMemberUseCase(mockMemberRepo, mockMemberValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un socio Pleno exitosamente si es mayor de edad y pasa validaciones', async () => {
        const mockRequest: CreateMemberRequest = {
            name: 'Juan Perez',
            dni: '12345678',
            email: 'juan@test.com',
            birthdate: '1990-01-01',
            category: 'Pleno'
        };

        // Simulamos que es mayor de edad
        vi.mocked(mockMemberValidator.isMinor).mockReturnValue(false);
        
        // Simulamos la respuesta de la base de datos
        vi.mocked(mockMemberRepo.create).mockResolvedValueOnce({
            id: 'uuid-1',
            ...mockRequest,
            status: 'Activo',
            created_at: '2026-04-28T00:00:00.000Z'
        });

        const result = await useCase.execute(mockRequest);

        // Verificamos que se hayan llamado las validaciones de negocio
        expect(mockMemberValidator.validateEmail).toHaveBeenCalledWith(mockRequest.email);
        expect(mockMemberValidator.validateDniIsUnique).toHaveBeenCalledWith(mockRequest.dni);
        
        // Verificamos que se haya intentado persistir con la categoría original y estado Activo
        expect(mockMemberRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Juan Perez',
            category: 'Pleno',
            status: 'Activo'
        }));

        expect(result.id).toBe('uuid-1');
        expect(result.category).toBe('Pleno');
    });

    it('debe forzar la categoría a Cadete si el socio es menor de edad', async () => {
        const mockRequest: CreateMemberRequest = {
            name: 'Pablito',
            dni: '99999999',
            email: 'pablo@test.com',
            birthdate: '2015-01-01',
            category: 'Pleno' // Intenta ser pleno de forma errónea
        };

        // Simulamos que el validador detecta que es menor
        vi.mocked(mockMemberValidator.isMinor).mockReturnValue(true);
        
        vi.mocked(mockMemberRepo.create).mockResolvedValueOnce({
            id: 'uuid-2',
            ...mockRequest,
            category: 'Cadete',
            status: 'Activo',
            created_at: '2026-04-28T00:00:00.000Z'
        });

        const result = await useCase.execute(mockRequest);

        // Verificamos que el UseCase haya sobrescrito la categoría antes de guardarlo
        expect(mockMemberRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            category: 'Cadete', 
        }));

        expect(result.category).toBe('Cadete');
    });
});
