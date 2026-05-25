import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';

export class DeleteDisciplineUseCase {
    constructor(
        private readonly disciplineRepo: IDisciplineRepository,
        private readonly validator: DisciplineValidator,
    ) {}

    async execute(id: string): Promise<void> {
        await this.validator.validateDisciplineExists(id);
        await this.disciplineRepo.delete(id);
    }
}