import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetLockers } from './GetLockers.js';
import { LockerRepository } from '../domain/LockerRepository.js';

describe('GetLockers', () => {
    // ─────────────────────────────────────────────────────────────────
    // Mock del repositorio
    // Solo necesitamos findAll para este caso de uso
    // ─────────────────────────────────────────────────────────────────
    const mockLockerRepo = {
        findAll: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new GetLockers(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 11: Retorna lista de lockers
    // Verifica que el caso de uso delega en el repositorio y retorna
    // exactamente lo que este devuelve, sin transformaciones.
    // GetLockers.ts -> repo.findAll() -> retorna la lista
    // ─────────────────────────────────────────────────────────────────
    it('debe retornar la lista de lockers desde el repositorio', async () => {
        const mockLockers = [
            { id: 'uuid-1', numero: 11, estado: 'Disponible', ubicacion: 'Vestuario Masculino', member_id: null },
            { id: 'uuid-2', numero: 22, estado: 'Ocupado',    ubicacion: 'Vestuario Femenino',  member_id: 'abc-123' },
        ];

        vi.mocked(mockLockerRepo.findAll).mockResolvedValueOnce(mockLockers as any);

        const result = await useCase.execute();

        expect(result).toEqual(mockLockers);
        expect(mockLockerRepo.findAll).toHaveBeenCalledOnce();
    });
});