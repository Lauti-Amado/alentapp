import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from './CreateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { PostgresMemberRepository } from '../infrastructure/PostgresMemberRepository.js';
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

    const memberRepo = new PostgresMemberRepository();

    const useCase = new CreateMedicalCertificateUseCase(mockMedicalCertificateRepo, mockValidator, mockMemberRepo);

    const validPayload: CreateMedicalCertificateRequest = {
        member_id: 2,
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

   // Testea que funcinone el caso de uso
    it('debe crear el certificado médico exitosamente cuando pasa todas las reglas de negocio', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(mockMember);
        vi.mocked(mockValidator.validarFechasCreate).mockResolvedValueOnce(undefined); 
        vi.mocked(mockMedicalCertificateRepo.create).mockResolvedValueOnce(mockMedicalCertificateDTO);

        const result = await useCase.execute(validPayload);

        expect(mockMemberRepo.findByDni).toHaveBeenCalledWith(
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

    // Testea que si el miembro no existe tire un error
    it('debe lanzar un error si el socio provisto no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null); // Simulamos que NO existe

        await expect(useCase.execute(validPayload)).rejects.toThrow('El socio provisto no existe');
        
        // Verificamos que al fallar acá, NO siga ejecutando lo de abajo
        expect(mockValidator.validarFechasCreate).not.toHaveBeenCalled();
        expect(mockMedicalCertificateRepo.create).not.toHaveBeenCalled();
    });
});
