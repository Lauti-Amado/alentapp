import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from './CreateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { CreateMedicalCertificateRequest, MedicalCertificateDTO, MemberDTO } from '@alentapp/shared';

describe('CreateMedicalCertificateUseCase', () => {
    const mockMedicalCertificateRepo = {
        create: vi.fn(),
        darDeBajaCertificadoPorSocio: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const mockValidator = {
        validarFechasCreate: vi.fn()
    } as unknown as MedicalCertificateValidator;

    // Pasamos los mocks limpios al caso de uso
    const useCase = new CreateMedicalCertificateUseCase(mockMedicalCertificateRepo, mockValidator, mockMemberRepo);

    const validPayload: CreateMedicalCertificateRequest = {
        member_id: 'uuid-member-1', // Cambiado a string para que coincida con el DTO
        fecha_emision: '2026-06-01',
        fecha_vencimiento: '2026-07-01',
        licencia_doctor: "81/131"
    };

    const mockMember: MemberDTO = {
        id: 'uuid-member-1',
        name: 'Maria Gonzales',
        dni: '34737838',
        email: 'maria@test.com',
        birthdate: '2004-07-10',
        category: 'Pleno',
        status: 'Activo',
        created_at: '2026-01-01T00:00:00.000Z',
    };

    const mockMedicalCertificateDTO: MedicalCertificateDTO = {
        id: 'uuid-medic-1',
        ...validPayload,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear el certificado médico exitosamente cuando pasa todas las reglas de negocio', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(mockMember);
        vi.mocked(mockValidator.validarFechasCreate).mockResolvedValueOnce(undefined); 
        vi.mocked(mockMedicalCertificateRepo.create).mockResolvedValueOnce(mockMedicalCertificateDTO);

        const result = await useCase.execute(validPayload);

        // CORREGIDO: Se verifica findById que es el espía real configurado arriba
        expect(mockMemberRepo.findById).toHaveBeenCalledWith(
            validPayload.member_id
        );
        expect(mockValidator.validarFechasCreate).toHaveBeenCalledWith(
            validPayload
        );
        expect(mockMedicalCertificateRepo.darDeBajaCertificadoPorSocio).toHaveBeenCalledWith(
            validPayload.member_id,
            validPayload.fecha_vencimiento,
        );
        expect(mockMedicalCertificateRepo.create).toHaveBeenCalledWith(validPayload);
        expect(result.id).toBe('uuid-medic-1');
    });

    it('debe lanzar un error si el socio provisto no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(validPayload)).rejects.toThrow('El socio provisto no existe');
        
        expect(mockValidator.validarFechasCreate).not.toHaveBeenCalled();
        expect(mockMedicalCertificateRepo.create).not.toHaveBeenCalled();
    });
});