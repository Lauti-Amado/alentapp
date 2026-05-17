import { SportRepository } from '../domain/SportRepository.js';

export class DeleteSportUseCase {
    constructor(private readonly sportRepo: SportRepository) {}

    async execute(id: string): Promise<void> {
        // Validar existencia del deporte
        const existingSport = await this.sportRepo.findById(id);
        if (!existingSport) {
            throw new Error('El deporte no existe');
        }

        // Ejecutar eliminación
        await this.sportRepo.delete(id);
    }
}
