import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

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

    async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
        const medicalCertificate = await prisma.medicalCertificate.update({
            where: { id },
            data: {
                ...(data.member_id !== undefined && { member_id: data.member_id }),
                ...(data.fecha_emision !== undefined && { fecha_emision: new Date(data.fecha_emision) }),
                ...(data.fecha_vencimiento !== undefined && { fecha_vencimiento: new Date(data.fecha_vencimiento) }),
                ...(data.esta_validado !== undefined && { esta_validado: data.esta_validado }),
                ...(data.licencia_doctor !== undefined && { licencia_doctor: data.licencia_doctor }),
            },
        });

        return this.mapToDTO(medicalCertificate);
    }

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