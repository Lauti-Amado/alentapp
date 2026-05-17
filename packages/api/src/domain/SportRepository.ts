import { SportDTO, CreateSportRequest } from '@alentapp/shared';

export interface SportRepository {
    create(data: CreateSportRequest): Promise<SportDTO>;
    findAll(): Promise<SportDTO[]>;
    findById(id: string): Promise<SportDTO | null>;
    findByName(name: string): Promise<SportDTO | null>;
}