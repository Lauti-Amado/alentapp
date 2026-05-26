import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateLocker } from './CreateLocker.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { CreateLockerRequest } from '@alentapp/shared';

describe('CreateLocker', () => {
    // ─────────────────────────────────────────────────────────────────
    // Mocks de dependencias (Repositorio y Validador)
    // No tocamos la DB real: el repositorio es un objeto simulado
    // ─────────────────────────────────────────────────────────────────
    const mockLockerRepo = {
        create: vi.fn(),
        findByNumero: vi.fn(),
    } as unknown as LockerRepository;

    const mockLockerValidator = {
        validateNumero: vi.fn(),
        validateNumeroIsUnique: vi.fn(),
    } as unknown as LockerValidator;

    const useCase = new CreateLocker(mockLockerRepo, mockLockerValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 7: Creación exitosa
    // Verifica que el caso de uso llama al validador, persiste el locker
    // y lo retorna con estado Disponible y member_id null por defecto.
    // CreateLocker.ts -> validateNumero() -> validateNumeroIsUnique() -> repo.create()
    // ─────────────────────────────────────────────────────────────────
    it('debe crear un locker exitosamente con estado Disponible y sin socio asignado', async () => {
        const mockRequest: CreateLockerRequest = {
            numero: 11,
            ubicacion: 'Vestuario Masculino',
        };

        // Simulamos la respuesta de la base de datos
        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce({
            id: 'uuid-1',
            numero: 11,
            ubicacion: 'Vestuario Masculino',
            estado: 'Disponible',
            member_id: null,
        });

        const result = await useCase.execute(mockRequest);

        // Verificamos que se llamaron las validaciones de negocio
        expect(mockLockerValidator.validateNumero).toHaveBeenCalledWith(11);
        expect(mockLockerValidator.validateNumeroIsUnique).toHaveBeenCalledWith(11);

        // Verificamos que se persistió con estado Disponible y sin socio
        // CreateLocker.ts hardcodea estado: 'Disponible' y member_id: null
        expect(mockLockerRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            numero: 11,
            ubicacion: 'Vestuario Masculino',
            estado: 'Disponible',
            member_id: null,
        }));

        expect(result.id).toBe('uuid-1');
        expect(result.estado).toBe('Disponible');
        expect(result.member_id).toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 8: Número inválido
    // Verifica que si validateNumero lanza un error, el caso de uso
    // lo propaga y NO intenta persistir nada en la base de datos.
    // CreateLocker.ts → validateNumero() lanza → repo.create() NUNCA se llama
    // ─────────────────────────────────────────────────────────────────
    it('debe lanzar error si el número del locker es inválido y no persistir nada', async () => {
        const mockRequest: CreateLockerRequest = {
            numero: -1,
            ubicacion: 'Vestuario Masculino',
        };

        // Simulamos que el validador detecta el número inválido
        vi.mocked(mockLockerValidator.validateNumero).mockImplementationOnce(() => {
            throw new Error('El número del locker es obligatorio y debe ser válido');
        });

        // Verificamos que el error se propaga correctamente
        await expect(useCase.execute(mockRequest)).rejects.toThrow(
            'El número del locker es obligatorio y debe ser válido'
        );

        // Verificamos que NUNCA se intentó persistir en la base de datos
        expect(mockLockerRepo.create).not.toHaveBeenCalled();
    });

});