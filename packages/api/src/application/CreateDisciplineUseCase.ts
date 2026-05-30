import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { DisciplineDTO, CreateDisciplineRequest } from '@alentapp/shared';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly validator: DisciplineValidator,
    ) {}

    async execute(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        // 1. Validar rango de fechas
        this.validator.validateDateRange(data.fechaInicio, data.fechaFin);

        // 2. Verificar que el socio exista
        const member = await this.validator.validateMemberExists(data.memberId);

        // 3. Verificar que no tenga una suspensión total activa
        await this.validator.validateNoActiveTotalSuspension(data.memberId, member.name, member.dni);

        // 4. Persistir
        return this.disciplineRepository.create(data);
    }
}