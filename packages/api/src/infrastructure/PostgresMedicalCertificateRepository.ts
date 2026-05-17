import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBMedicalCertificate = {
    id: string;
    fecha_emision: Date;
    fecha_vencimiento: Date;
    licencia_doctor: string;
    esta_validada: Boolean;
    member_id: string;
};

export class PostgresMedicalCertificateRepository implements MedicalCertificateRepository {

    async create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
        const medicalCertificate = await prisma.medicalCertificate.create({
            data: {
                fecha_emision: new Date(data.fecha_emision),
                fecha_vencimiento: new Date(data.fecha_vencimiento),
                esta_validada: true,
                licencia_doctor: data.licencia_doctor,
                member_id: data.member_id,
            },
        });

        return this.mapToDTO(medicalCertificate);
    }

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