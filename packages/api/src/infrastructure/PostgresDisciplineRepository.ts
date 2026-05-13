import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO, CreateDisciplineRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBDiscipline = {
    id: string;
    motivo: string;
    fechaInicio: Date;
    fechaFin: Date;
    esSuspensionTotal: boolean;
    motivoLevantamiento: string | null;
    memberId: string;
};

export class PostgresDisciplineRepository implements IDisciplineRepository {
    async create(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        const discipline = await prisma.discipline.create({
            data: {
                motivo: data.motivo,
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: new Date(data.fechaFin),
                esSuspensionTotal: data.esSuspensionTotal,
                motivoLevantamiento: data.motivoLevantamiento,
                memberId: data.memberId,
            },
        });

        return this.mapToDTO(discipline);
    }

    async findAll(): Promise<DisciplineDTO[]> {
        const disciplines = await prisma.discipline.findMany({
            orderBy: { fechaInicio: 'desc' },
        });

        return disciplines.map((d) => this.mapToDTO(d));
    }

    async findActiveTotalSuspensionByMember(memberId: string): Promise<DisciplineDTO | null> {
        const discipline = await prisma.discipline.findFirst({
            where: {
                memberId,
                esSuspensionTotal: true,
                motivoLevantamiento: null,
                fechaFin: { gt: new Date() },
            },
        });

        return discipline ? this.mapToDTO(discipline) : null;
    }

    private mapToDTO(discipline: DBDiscipline): DisciplineDTO {
        return {
            id: discipline.id,
            motivo: discipline.motivo,
            fechaInicio: discipline.fechaInicio.toISOString(),
            fechaFin: discipline.fechaFin.toISOString(),
            esSuspensionTotal: discipline.esSuspensionTotal,
            motivoLevantamiento: discipline.motivoLevantamiento,
            memberId: discipline.memberId,
        };
    }
}