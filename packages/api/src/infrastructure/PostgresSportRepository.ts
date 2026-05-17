import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBSport = {
    id: string;
    Cupo_maximo: number;
    Precio_adicional: number;
    Descripcion: string;
    Require_certificado_medico: boolean;
    Nombre: string;
};

export class PostgresSportRepository implements SportRepository {

    async create(data: CreateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.create({
            data: {
                Nombre: data.Nombre,
                Cupo_maximo: data.Cupo_maximo,
                Precio_adicional: data.Precio_adicional,
                Descripcion: data.Descripcion,
                Require_certificado_medico: data.Require_certificado_medico,
            },
        });

        return this.mapToDTO(sport);
    }

    async findById(id: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

     async findByName(Nombre: string): Promise<SportDTO | null> {
            const sport = await prisma.sport.findUnique({
                where: { Nombre },
            });
    
            return sport ? this.mapToDTO(sport) : null;
        }

    async findAll(): Promise<SportDTO[]> {
        const sports = await prisma.sport.findMany();

        return sports.map(this.mapToDTO);
    }

     async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
            const sport = await prisma.sport.update({
                where: { id },
                data: {
                    ...(data.Cupo_maximo !== undefined && {
                        Cupo_maximo: data.Cupo_maximo,
                    }),
                    ...(data.Descripcion !== undefined && {
                        Descripcion: data.Descripcion,
                    }),
                },
            });
    
            return this.mapToDTO(sport);
        }

         async delete(id: string): Promise<void> {
        await prisma.sport.delete({
            where: { id },
        });
    }


    private mapToDTO(sport: DBSport): SportDTO {
        return {
            id: sport.id,
            Nombre: sport.Nombre,
            Cupo_maximo: sport.Cupo_maximo,
            Precio_adicional: sport.Precio_adicional,
            Descripcion: sport.Descripcion,
            Require_certificado_medico: sport.Require_certificado_medico,
        };
    }
}