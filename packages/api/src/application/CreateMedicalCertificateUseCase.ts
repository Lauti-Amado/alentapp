import { isAfter } from 'date-fns';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { MedicalCertificateDTO, CreateMedicalCertificateRequest } from '@alentapp/shared';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';

export class CreateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepository: MedicalCertificateRepository,
        private readonly medicalCertificateValidator: MedicalCertificateValidator,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {

        // 1. Verificar que el socio exista
        const member = await this.memberRepository.findById(data.member_id);
        if (!member) {
            throw new Error('El socio provisto no existe');
        }

        // 2. Validar rango de fechas
        if ((data.fecha_emision != null) && (data.fecha_vencimiento !== null)) {
           await this.medicalCertificateValidator.validarFechasCreate(data)
        } else {
           throw new Error('Las fechas de emision y vencimiento son obligatorias');
        }

        // 3. Invalida el ultimo certificado médico del socio
        await this.medicalCertificateRepository.darDeBajaCertificadoPorSocio(data.member_id, new Date(data.fecha_vencimiento))

        // 4. Persistir
        return this.medicalCertificateRepository.create(data);
    }
}