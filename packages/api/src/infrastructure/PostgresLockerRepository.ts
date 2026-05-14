import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerDTO, CreateLockerRequest, LockerStatus } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBLocker = {
    id: string;
    numero: number;
    estado: LockerStatus;
    ubicacion: string;
    member_id: string | null;
};

export class PostgresLockerRepository implements LockerRepository {    
    async create(data: CreateLockerRequest): Promise<LockerDTO> {
        const locker = await prisma.locker.create({
            data: {
                numero: data.numero,
                ubicacion: data.ubicacion,
                // Prisma se encarga de setear 'Disponible' por el default(Disponible)
                // y member_id en null por ser opcional, cumpliendo el Criterio de Aceptación.
            },
        });

        return this.mapToDTO(locker as DBLocker);
    }

    async findAll(): Promise<LockerDTO[]> {
    const lockers = await prisma.locker.findMany({
        orderBy: { numero: 'asc' }, // Los ordenamos por número para que sea más prolijo
    });

    return lockers.map(locker => this.mapToDTO(locker as DBLocker));
}

    async findByNumero(numero: number): Promise<LockerDTO | null> {
        const locker = await prisma.locker.findUnique({
            where: { numero },
        });

        return locker ? this.mapToDTO(locker as DBLocker) : null;
    }

    private mapToDTO(locker: DBLocker): LockerDTO {
        return {
            id: locker.id,
            numero: locker.numero,
            estado: locker.estado,
            ubicacion: locker.ubicacion,
            member_id: locker.member_id,
        };
    }
}