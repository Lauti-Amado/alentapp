import { DisciplineDTO, CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

export interface IDisciplineRepository {
    create(data: CreateDisciplineRequest): Promise<DisciplineDTO>;
    findAll(): Promise<DisciplineDTO[]>;
    findById(id: string): Promise<DisciplineDTO | null>;
    update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO>;
    findActiveTotalSuspensionByMember(memberId: string): Promise<DisciplineDTO | null>;
}