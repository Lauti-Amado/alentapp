import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteLocker } from './DeleteLocker.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('DeleteLocker', () => {
    // ─────────────────────────────────────────────────────────────────
    // Mock del repositorio
    // Solo necesitamos findById y delete para este caso de uso
    // ─────────────────────────────────────────────────────────────────
    const mockLockerRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new DeleteLocker(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 9: Locker inexistente
    // Verifica que si el locker no existe, se lanza un error descriptivo
    // y NUNCA se intenta ejecutar el delete en la base de datos.
    // DeleteLocker.ts -> findById() retorna null -> lanza error -> delete() NUNCA se llama
    // ─────────────────────────────────────────────────────────────────
    it('debe lanzar error si el locker no existe y no ejecutar el delete', async () => {
        // Simulamos que el locker no existe en la DB
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-999')).rejects.toThrow(
            'El locker solicitado no existe'
        );

        // Verificamos que nunca se intentó eliminar nada
        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });
});