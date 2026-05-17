import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

export class DeleteMedicalCertificateUseCase {
    constructor(private readonly medicalCertificateRepo: MedicalCertificateRepository) {}

    async execute(id: string): Promise<void> {
        // Validar existencia del certificado médico
        const existingMedicalCertificate = await this.medicalCertificateRepo.findById(id);
        if (!existingMedicalCertificate) {
            throw new Error('El certificado médico no existe');
        }

        // Ejecutar eliminación
        await this.medicalCertificateRepo.delete(id);
    }
}
