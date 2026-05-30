import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO, UpdateMedicalCertificateRequest } from '@alentapp/shared';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';

export class UpdateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepo: MedicalCertificateRepository,
        private readonly medicalCertificateValidator: MedicalCertificateValidator
    ) {}

    async execute(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
        // 1. Verificar que el certificado médico existe
        const existing = await this.medicalCertificateRepo.findById(id);
        if (!existing) {
            throw new Error('El registro del certificado médico no existe');
        }

        // 3. Re-validar rango de fechas si se modifica alguna
        if (data.fecha_emision !== undefined || data.fecha_vencimiento !== undefined) {
           await this.medicalCertificateValidator.validarFechasUpdate(id, data)
        }

        
        let finalData = { ...data };

        return this.medicalCertificateRepo.update(id, finalData);
    }
}
