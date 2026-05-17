import { IDisciplineRepository } from '../domain/DisciplineRepository.js';

export class DeleteDisciplineUseCase {
    constructor(private readonly disciplineRepo: IDisciplineRepository) {}

    async execute(id: string): Promise<void> {
        const existing = await this.disciplineRepo.findById(id);
        if (!existing) {
            throw new Error('No se encontró la sanción especificada para eliminar');
        }

        await this.disciplineRepo.delete(id);
    }
}