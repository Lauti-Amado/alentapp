import { DisciplineDTO, CreateDisciplineRequest } from '@alentapp/shared';

export interface IDisciplineRepository {
    create(data: CreateDisciplineRequest): Promise<DisciplineDTO>;
    findAll(): Promise<DisciplineDTO[]>;
    findActiveTotalSuspensionByMember(memberId: string): Promise<DisciplineDTO | null>;
}