import { MemberRepository } from '../MemberRepository.js';
import { MedicalCertificateRepository } from '../MedicalCertificateRepository.js';
import { isAfter } from 'date-fns';
import { UpdateMedicalCertificateRequest } from '../../../../shared/index.js';

export class MedicalCertificateValidator {
    constructor(
        private readonly medicalCertificateRepo: MedicalCertificateRepository
    ) {}

    async validarFechas(id: string, data: UpdateMedicalCertificateRequest): Promise<void> {
        // Trae los datos del certificado médico
        const existing = await this.medicalCertificateRepo.findById(id);
        if (!existing) {
            throw new Error('El registro del certificado médico no existe');
        }
        
        const emision = new Date(data.fecha_emision ?? existing.fecha_emision);
        const vencimiento = new Date(data.fecha_vencimiento ?? existing.fecha_vencimiento);
        if (!isAfter(vencimiento, emision)) {
            throw new Error('Error al modificar el certificado médico. El rango de fechas introducido es inválido');
        }
        
    }
}
