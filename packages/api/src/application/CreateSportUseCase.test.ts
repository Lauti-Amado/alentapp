import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './CreateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('CreateSportUseCase', () => {

    // Mock del repositorio
    const mockSportRepo = {
        findAll: vi.fn(),
        create: vi.fn(),
    } as unknown as SportRepository;

    // Instancia del caso de uso
    const useCase = new CreateSportUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un deporte exitosamente si los datos son válidos', async () => {

        const mockRequest: CreateSportRequest = {
            Nombre: 'Fútbol',
            Cupo_maximo: 10,
            Precio_adicional: 1000,
            Descripcion: 'Deporte grupal',
            Require_certificado_medico: true
        };

        // Simulamos que no existen deportes duplicados
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce([]);

        // Simulamos respuesta de la base de datos
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
            id: 'uuid-1',
            ...mockRequest
        });

        const result = await useCase.execute(mockRequest);

        // Verificamos búsqueda previa de deportes
        expect(mockSportRepo.findAll).toHaveBeenCalled();

        // Verificamos persistencia
        expect(mockSportRepo.create).toHaveBeenCalledWith(mockRequest);

        expect(result.id).toBe('uuid-1');
        expect(result.Nombre).toBe('Fútbol');
    });

    it('debe lanzar error si el nombre del deporte está vacío', async () => {

        const mockRequest: CreateSportRequest = {
            Nombre: '',
            Cupo_maximo: 20,
            Precio_adicional: 1000,
            Descripcion: 'Deporte grupal',
            Require_certificado_medico: true
        };

        await expect(useCase.execute(mockRequest))
            .rejects
            .toThrow('El nombre del deporte es obligatorio');
    });

    it('debe lanzar error si ya existe un deporte con el mismo nombre', async () => {

        const mockRequest: CreateSportRequest = {
            Nombre: 'futbol',
            Cupo_maximo: 20,
            Precio_adicional: 1000,
            Descripcion: 'Deporte grupal',
            Require_certificado_medico: true
        };

        // Simulamos deporte existente
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce([
            {
                id: 'uuid-99',
                Nombre: 'Fútbol',
                Cupo_maximo: 15,
                Precio_adicional: 500,
                Descripcion: 'Existente',
                Require_certificado_medico: false
            }
        ]);

        await expect(useCase.execute(mockRequest))
            .rejects
            .toThrow('Ya existe un deporte con ese nombre');
    });

    it('debe lanzar error si el cupo máximo es menor o igual a cero', async () => {

        const mockRequest: CreateSportRequest = {
            Nombre: 'Tenis',
            Cupo_maximo: 0,
            Precio_adicional: 1000,
            Descripcion: 'Deporte individual',
            Require_certificado_medico: false
        };

        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce([]);

        await expect(useCase.execute(mockRequest))
            .rejects
            .toThrow('El formato de cupos máximo debe ser un numero mayor a cero');
    });

});