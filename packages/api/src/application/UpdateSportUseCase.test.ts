import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO, UpdateSportRequest } from '@alentapp/shared';

describe('UpdateSportUseCase', () => {
    // 1. Definición de los mocks del repositorio
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    // 2. Instanciación del caso de uso inyectando el mock del repositorio
    const useCase = new UpdateSportUseCase(mockSportRepo);

    // 3. Objeto base que simula un deporte existente con todos los campos requeridos por SportDTO
    const mockExistingSport: SportDTO = {
        id: 'sport-uuid-1',
        Nombre: 'Fútbol',
        Cupo_maximo: 20,
        Descripcion: 'Fútbol Senior',
        Precio_adicional: 0,
        Require_certificado_medico: false
    };

    // 4. Limpieza y configuración por defecto antes de cada test
    beforeEach(() => {
        vi.clearAllMocks();
        // Por defecto, asumimos que el deporte existe en la base de datos
        vi.mocked(mockSportRepo.findById).mockResolvedValue(mockExistingSport);
    });

    // --- TESTS UNITARIOS ---

    it('debe lanzar un error si el deporte no existe', async () => {
        // Forzamos a que para este test en específico devuelva null
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);
        
        await expect(useCase.execute('sport-no-existe', {}))
            .rejects.toThrow('El deporte no existe');
    });

    it('debe lanzar un error si se intenta modificar un campo no permitido', async () => {
        // 'Nombre' no está permitido en la lista de campos modificables
        const updateData = { Cupo_maximo: 30, Nombre: 'Fútbol Pro' } as unknown as UpdateSportRequest;

        await expect(useCase.execute('sport-uuid-1', updateData))
            .rejects.toThrow('Solo se puede modificar Cupo_maximo y Descripcion');
    });

    it('debe lanzar un error si el cupo máximo es menor o igual a cero', async () => {
        const updateData: UpdateSportRequest = { Cupo_maximo: 0 };

        await expect(useCase.execute('sport-uuid-1', updateData))
            .rejects.toThrow('El cupo máximo debe ser mayor a cero');
    });

    it('debe lanzar un error si la descripción supera los 255 caracteres', async () => {
        const updateData: UpdateSportRequest = { 
            Descripcion: 'a'.repeat(256) // Genera un string de 256 caracteres para forzar el fallo
        };

        await expect(useCase.execute('sport-uuid-1', updateData))
            .rejects.toThrow('La descripción no puede superar los 255 caracteres');
    });

    it('debe actualizar y retornar el deporte si todos los datos son válidos', async () => {
        const updateData: UpdateSportRequest = { Cupo_maximo: 15, Descripcion: 'Fútbol reducido' };
        
        const updatedSport: SportDTO = { 
            ...mockExistingSport, 
            Cupo_maximo: updateData.Cupo_maximo!, 
            Descripcion: updateData.Descripcion! 
        };
        
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce(updatedSport);

        const result = await useCase.execute('sport-uuid-1', updateData);

        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-uuid-1', updateData);
        expect(result).toEqual(updatedSport);
    });

    it('debe permitir actualizar solo un campo (ej. solo Descripcion) sin alterar el resto', async () => {
        // La descripción viene, pero el cupo máximo es undefined (omitido)
        const updateData: UpdateSportRequest = { Descripcion: 'Solo cambio la descripción' };
        
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({ 
            ...mockExistingSport, 
            // Si viene la descripción la usa, si no, mantiene la original para no romper el tipo estricto string
            Descripcion: updateData.Descripcion ?? mockExistingSport.Descripcion 
        });

        await useCase.execute('sport-uuid-1', updateData);

        // Verifica que se llamó al repositorio con el payload correcto
        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-uuid-1', updateData);
        
        // Verifica que NO se envió accidentalmente el Cupo_maximo como parte del cambio
        expect(mockSportRepo.update).not.toHaveBeenCalledWith(
            'sport-uuid-1', 
            expect.objectContaining({ Cupo_maximo: expect.any(Number) })
        );
    });
});