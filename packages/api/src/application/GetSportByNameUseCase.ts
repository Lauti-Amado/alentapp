import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO } from '@alentapp/shared';

export class GetSportByNameUseCase {
    constructor(private readonly sportRepo: SportRepository) {}

    async execute(nombre: string): Promise<SportDTO> {
        const sport = await this.sportRepo.findByDni(nombre);
        if (!sport) {
            throw new Error('El deporte provisto no existe');
        }
        return sport;
    }
}
