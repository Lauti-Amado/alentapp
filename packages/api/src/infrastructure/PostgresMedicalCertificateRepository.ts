import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO, CreateMedicalCertificateRequest, UpdateDisciplineRequest } from '@alentapp/shared';

export class PostgresMedicalCertificateRepository implements MedicalCertificateRepository {
    async create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {}
    async findAll(): Promise<MedicalCertificateDTO[]> {
        const medicalCertificates = await prisma.medicalCertificate.findMany({ 
            orderBy: { fecha_emision: 'desc' },
        });
     
        return medicalCertificates.map((m) => this.mapToDTO(m));
    }
    async findById(id: string): Promise<MedicalCertificateDTO | null> {

    }
    //async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO>;
    async delete(id: string): Promise<void> {

    }

    private mapToDTO(medicalCertificate: DBMedicalCertificate): MedicalCertificateDTO {
        return {
            id: medicalCertificate.id,
            fecha_emision: medicalCertificate.fecha_emision.toISOString(),
            fecha_vencimiento: medicalCertificate.fecha_vencimiento.toISOString(),
            esta_validada: medicalCertificate.esta_validada,
            licencia_doctor: medicalCertificate.licencia_doctor,
            member_id: medicalCertificate.member_id,
        };
    }
}