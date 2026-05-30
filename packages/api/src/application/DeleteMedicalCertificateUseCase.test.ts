import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMedicalCertificateUseCase } from './DeleteMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO } from '@alentapp/shared';

describe('DeleteMedicalCertificateUseCase', () => {
    const mockMedicalCertificateRepo = {
        delete: vi.fn(),
        darDeAltaCertificadoPorSocio: vi.fn(),
        findById: vi.fn()
    } as unknown as MedicalCertificateRepository;

    const useCase = new DeleteMedicalCertificateUseCase(mockMedicalCertificateRepo);

    const existingDTO: MedicalCertificateDTO = {
        id: 'uuid-medcer-1',
        licencia_doctor: '998/182113',
        fecha_emision: '2026-06-01',
        fecha_vencimiento: '2026-07-01',
        esta_validada: true,
        member_id: 'uuid-member-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test de eliminación exitosa
    it('debe validar la existencia, eliminar el certificado y activar el último restante del socio', async () => {
        // Configuramos los mocks para que encuentren el certificado y resuelvan las operaciones
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(existingDTO);
        vi.mocked(mockMedicalCertificateRepo.delete).mockResolvedValueOnce(undefined);
        vi.mocked(mockMedicalCertificateRepo.darDeAltaCertificadoPorSocio).mockResolvedValueOnce(undefined);

        await useCase.execute('uuid-medcer-1');

        // Verifica que se buscó la existencia correctamente
        expect(mockMedicalCertificateRepo.findById).toHaveBeenCalledWith('uuid-medcer-1');

        // Verifica que se eliminó el certificado correcto
        expect(mockMedicalCertificateRepo.delete).toHaveBeenCalledWith('uuid-medcer-1');
        expect(mockMedicalCertificateRepo.delete).toHaveBeenCalledTimes(1);

        // Verifica la regla de negocio: pasar a true el último certificado de ESE socio específico
        expect(mockMedicalCertificateRepo.darDeAltaCertificadoPorSocio).toHaveBeenCalledWith('uuid-member-1');
        expect(mockMedicalCertificateRepo.darDeAltaCertificadoPorSocio).toHaveBeenCalledTimes(1);
    });

    // Test de flujo alternativo: certificado inexistente
    it('debe lanzar un error y no proceder al borrado si el certificado médico no existe', async () => {
        // Simula que el repositorio devuelve null al buscar el id
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-inexistente')).rejects.toThrow(
            'El certificado médico no existe'
        );

        // Valida que por seguridad no se llamó a borrar ni a actualizar estados
        expect(mockMedicalCertificateRepo.delete).not.toHaveBeenCalled();
        expect(mockMedicalCertificateRepo.darDeAltaCertificadoPorSocio).not.toHaveBeenCalled();
    });
});