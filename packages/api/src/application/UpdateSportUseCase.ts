import { isAfter } from 'date-fns';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO, UpdateSportRequest } from '@alentapp/shared';

export class UpdateSportUseCase {
    constructor(private readonly sportRepo: SportRepository) {}

    async execute(id: string, data: UpdateSportRequest): Promise<SportDTO> {

        // 1. Verificar que el deporte exista
        const existing = await this.sportRepo.findById(id);

        if (!existing) {
            throw new Error('El deporte no existe');
        }

        // 2. Validar que solo se modifiquen campos permitidos
        const allowedFields = ['Cupo_maximo', 'Descripcion'];
        const receivedFields = Object.keys(data);

        const invalidFields = receivedFields.filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            throw new Error(
                'Solo se puede modificar Cupo_maximo y Descripcion'
            );
        }

        // 3. Validar cupo si viene
        if (data.Cupo_maximo !== undefined) {
            if (data.Cupo_maximo <= 0) {
                throw new Error('El cupo máximo debe ser mayor a cero');
            }
        }

        // 4. Validar descripción si viene
        if (data.Descripcion !== undefined) {
            if (data.Descripcion.length > 255) {
                throw new Error('La descripción no puede superar los 255 caracteres');
            }
        }

        // 5. Persistir cambios
        return this.sportRepo.update(id, data);
    }
}