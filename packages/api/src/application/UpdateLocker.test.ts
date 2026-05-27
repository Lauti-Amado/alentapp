import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateLocker } from './UpdateLocker.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

describe('UpdateLocker', () => {
    // ─────────────────────────────────────────────────────────────────
    // Mocks de dependencias (Repositorio y Validador)
    // ─────────────────────────────────────────────────────────────────
    const mockLockerRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as LockerRepository;

    const mockLockerValidator = {
        validateNumero: vi.fn(),
        validateNumeroIsUnique: vi.fn(),
    } as unknown as LockerValidator;

    const useCase = new UpdateLocker(mockLockerRepo, mockLockerValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 12: Locker inexistente
    // Verifica que si el locker no existe, se lanza un error descriptivo
    // y NUNCA se intenta ejecutar el update en la base de datos.
    // UpdateLocker.ts -> findById() retorna null -> lanza error -> update() nunca se llama
    // ─────────────────────────────────────────────────────────────────
    it('debe lanzar error si el locker no existe y no ejecutar el update', async () => {
        // Simulamos que el locker no existe en la DB
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-999', { ubicacion: 'Nuevo lugar' })).rejects.toThrow(
            'El locker solicitado no existe'
        );

        // Verificamos que nunca se intentó actualizar nada
        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });
});