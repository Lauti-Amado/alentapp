import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

export class UpdateDisciplineUseCase {
    constructor(
        private readonly disciplineRepo: IDisciplineRepository,
        private readonly validator: DisciplineValidator,
    ) {}

    async execute(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        // 1. Verificar que la sanción exista
        const existing = await this.validator.validateDisciplineExists(id);

        // 2. Re-validar rango de fechas si se modifica alguna
        this.validator.validateDateRangeForUpdate(data, existing);

        // 3. Validar levantamiento si se envía motivoLevantamiento
        this.validator.validateLevantamiento(existing, data.motivoLevantamiento);

        // 4. Persistir
        return this.disciplineRepo.update(id, data);
    }
}