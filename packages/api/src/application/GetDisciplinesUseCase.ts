import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO } from '@alentapp/shared';

export class GetDisciplinesUseCase {
    constructor(private readonly disciplineRepo: IDisciplineRepository) {}

    async execute(): Promise<DisciplineDTO[]> {
        return this.disciplineRepo.findAll();
    }
}