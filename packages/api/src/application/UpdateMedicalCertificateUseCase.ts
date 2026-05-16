import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export class UpdateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepo: MedicalCertificateRepository,
    ) {}

    async execute(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
        // Validar existencia del miembro
        const existingMedicalCertificate = await this.medicalCertificateRepo.findById(id);
        if (!existingMedicalCertificate) {
            throw new Error('El certificado médico no existe');
        }

        // Validar la fecha de vencimiento es mayor que la fecha de emiison
        if (data.fecha_emision || data.fecha_vencimiento) {
            this.memberValidator.validateEmail(data.email);
        }
        
        return this.medicalCertificateRepo.update(id, finalData);
    }
}
