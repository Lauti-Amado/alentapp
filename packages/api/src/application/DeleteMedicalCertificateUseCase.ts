import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

export class DeleteMedicalCertificateUseCase {
    constructor(private readonly medicalCertificateRepo: MedicalCertificateRepository) {}

    async execute(id: string): Promise<void> {
        // 1. Validar existencia del certificado médico antes de borrar
        const existingMedicalCertificate = await this.medicalCertificateRepo.findById(id);
        if (!existingMedicalCertificate) {
            throw new Error('El certificado médico no existe');
        }

        // 2. Ejecutar la eliminación del certificado actual
        await this.medicalCertificateRepo.delete(id);

        // 3. Buscar el último certificado restante DE ESE SOCIO y pasarlo a true
        // Usamos el 'member_id' que rescatamos del certificado existente antes de borrarlo
        await this.medicalCertificateRepo.darDeAltaCertificadoPorSocio(existingMedicalCertificate.member_id);
    }
}