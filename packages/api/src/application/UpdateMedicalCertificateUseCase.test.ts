import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMedicalCertificateUseCase } from './UpdateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { MedicalCertificateDTO, UpdateMedicalCertificateRequest } from '@alentapp/shared';

describe('UpdateMedicalCertificateUseCase', () => {
    // 1. Mocks ajustados a los métodos reales del repositorio y validador
    const mockMedicalCertificateRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const mockValidator = {
        validarFechasUpdate: vi.fn(),
    } as unknown as MedicalCertificateValidator;

    const useCase = new UpdateMedicalCertificateUseCase(mockMedicalCertificateRepo, mockValidator);

    // Entidad existente en la base de datos
    const existingCertificate: MedicalCertificateDTO = {
        id: 'uuid-cert-1',
        member_id: 'uuid-member-1',
        fecha_emision: '2026-06-01T00:00:00.000Z',
        fecha_vencimiento: '2026-07-01T00:00:00.000Z',
        licencia_doctor: '98/1821',
        esta_validada: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test que verifica una correcta actualizacion de un certificado médico en caso de editar alguna fecha 
    it('debe actualizar el certificado exitosamente disparando el validador si se modifican las fechas', async () => {
        const updatePayload: UpdateMedicalCertificateRequest = {
            fecha_emision: '2026-06-05T00:00:00.000Z',
            licencia_doctor: '38190192-MODIFICADA'
        };

        const updatedDTO: MedicalCertificateDTO = {
            ...existingCertificate,
            fecha_emision: '2026-06-05T00:00:00.000Z',
            licencia_doctor: '38190192-MODIFICADA',
        };

        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(existingCertificate);
        vi.mocked(mockMedicalCertificateRepo.update).mockResolvedValueOnce(updatedDTO);

        const result = await useCase.execute('uuid-cert-1', updatePayload);

        expect(mockMedicalCertificateRepo.findById).toHaveBeenCalledWith('uuid-cert-1');
        
        expect(mockValidator.validarFechasUpdate).toHaveBeenCalledWith('uuid-cert-1', updatePayload);
        
        expect(mockMedicalCertificateRepo.update).toHaveBeenCalledWith('uuid-cert-1', updatePayload);
        expect(result.fecha_emision).toBe('2026-06-05T00:00:00.000Z');
    });

    // Test que rechaza la actualización en caso de no mandarse en un formato ISO DATETIME
    it('debe propagar el error del validador y NO actualizar si validarFechasUpdate falla', async () => {
        const updatePayload: UpdateMedicalCertificateRequest = {
            fecha_emision: '2026-06-20', // Fecha inválida o lógica rota
        };

        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(existingCertificate);
        
        vi.mocked(mockValidator.validarFechasUpdate).mockRejectedValueOnce(
            new Error('La fecha de vencimiento no puede ser anterior a la de emisión')
        );

        await expect(useCase.execute('uuid-cert-1', updatePayload))
            .rejects
            .toThrow('La fecha de vencimiento no puede ser anterior a la de emisión');

        expect(mockMedicalCertificateRepo.update).not.toHaveBeenCalled();
    });

    // Test que comprueba que si no se editan fechas, no se llama al validador de fechas y se actualiza el certificado
    it('debe actualizar el certificado sin llamar al validador de fechas si ninguna fecha es modificada', async () => {
        const updatePayload: UpdateMedicalCertificateRequest = {
            licencia_doctor: '55/9999'
        };

        const updatedDTO: MedicalCertificateDTO = {
            ...existingCertificate,
            licencia_doctor: '55/9999'
        };

        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(existingCertificate);
        vi.mocked(mockMedicalCertificateRepo.update).mockResolvedValueOnce(updatedDTO);

        const result = await useCase.execute('uuid-cert-1', updatePayload);

        expect(mockMedicalCertificateRepo.findById).toHaveBeenCalledWith('uuid-cert-1');
        
        expect(mockValidator.validarFechasUpdate).not.toHaveBeenCalled();
        
        expect(mockMedicalCertificateRepo.update).toHaveBeenCalledWith('uuid-cert-1', updatePayload);
        expect(result.licencia_doctor).toBe('55/9999');
    });

    // Test que lanza un error si el certificado médico no existe en la base de datos
    it('debe lanzar un error si el certificado médico a actualizar no existe en la base de datos', async () => {
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(null);

        const dummyPayload: UpdateMedicalCertificateRequest = { esta_validada: true };

        await expect(useCase.execute('uuid-invalido', dummyPayload))
            .rejects
            .toThrow('El registro del certificado médico no existe');

        expect(mockValidator.validarFechasUpdate).not.toHaveBeenCalled();
        expect(mockMedicalCertificateRepo.update).not.toHaveBeenCalled();
    });
});