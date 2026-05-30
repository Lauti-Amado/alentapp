import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificateValidator } from './MedicalCertificateValidator.js';
import { MedicalCertificateRepository } from '../MedicalCertificateRepository.js';

describe('MedicalCertificateValidator', () => {
    const mockMedicalCertificateRepo = {
        findById: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const validator = new MedicalCertificateValidator(mockMedicalCertificateRepo);

    const mockMedicalCertificate = {
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

    describe('validarFechasUpdate', () => {
        it('debe lanzar error si el certificado médico a editar no existe en el sistema', async () => {
            // Simula que la base de datos no encuentra el medicalCertificate
            vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(null);

            await expect(
                validator.validarFechasUpdate('id-inexistente', { fecha_emision: '2026-06-01' })
            ).rejects.toThrow('El registro del certificado médico no existe');
        });

        it('debe lanzar error si la fecha_vencimiento modificada no es posterior a la de emision', async () => {
            // Simula que la base de datos encuentra el medicalCertificate original
            vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(mockMedicalCertificate);

            // payload de prueba inválido ya que fecha_vencimiento anterior a la de emisión
            const payloadInvalido = {
                fecha_emision: '2026-06-15',
                fecha_vencimiento: '2026-06-01' 
            };

            await expect(
                validator.validarFechasUpdate(mockMedicalCertificate.id, payloadInvalido)
            ).rejects.toThrow('Error al modificar el certificado médico. El rango de fechas introducido es inválido');
        });
    });

    describe('validarFechasCreate', () => {
        it('debe lanzar error si al crear un certificado la fecha de vencimiento es igual o anterior a la de emision', async () => {
            // payload inválido porque la fechas tienen el mismo día
            const payloadFechasIguales = {
                fecha_emision: '2026-06-01',
                fecha_vencimiento: '2026-06-01'
            };

            await expect(
                validator.validarFechasCreate(payloadFechasIguales)
            ).rejects.toThrow('Error al modificar el certificado médico. El rango de fechas introducido es inválido');
        });
    });
});