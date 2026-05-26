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
    // y nunca se intenta ejecutar el delete en la base de datos.
    // DeleteLocker.ts -> findById() retorna null -> lanza error -> delete() nunca se llama
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

    // ─────────────────────────────────────────────────────────────────
    // TEST 10: Eliminación exitosa
    // Verifica que si el locker existe, se llama a delete con el id correcto.
    // DeleteLocker.ts -> findById() retorna locker -> repo.delete() se llama
    // ─────────────────────────────────────────────────────────────────
    it('debe eliminar el locker exitosamente si existe', async () => {
        // Simulamos que el locker existe en la DB
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            id: 'uuid-1',
            numero: 11,
            estado: 'Disponible',
            ubicacion: 'Vestuario Masculino',
            member_id: null,
        });

        await useCase.execute('uuid-1');

        // Verificamos que se llamó a delete con el id correcto
        expect(mockLockerRepo.delete).toHaveBeenCalledWith('uuid-1');
    });

});