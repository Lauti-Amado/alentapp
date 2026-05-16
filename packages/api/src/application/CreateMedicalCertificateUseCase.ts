import { isAfter } from 'date-fns';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { MedicalCertificateDTO, CreateMedicalCertificateRequest } from '@alentapp/shared';

export class CreateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: MedicalCertificateRepository,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
        // 1. Validar rango de fechas
        if (!isAfter(new Date(data.fecha_vencimiento), new Date(data.fecha_emision))) {
            throw new Error('La fecha de vencimiento debe ser mayor a la de emision');
        }

        // 2. Verificar que el socio exista
        const member = await this.memberRepository.findById(data.member_id);
        if (!member) {
            throw new Error('El socio provisto no existe');
        }

        // 4. Persistir
        return this.medicalCertificateRepository.create(data);
    }
}