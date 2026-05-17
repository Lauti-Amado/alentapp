import { isAfter } from 'date-fns';
import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

export class UpdateDisciplineUseCase {
    constructor(private readonly disciplineRepo: IDisciplineRepository) {}

    async execute(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        // 1. Verificar que la sanción exista
        const existing = await this.disciplineRepo.findById(id);
        if (!existing) {
            throw new Error('El registro de sanción no existe');
        }

        // 2. Re-validar rango de fechas si se modifica alguna
        if (data.fechaInicio !== undefined || data.fechaFin !== undefined) {
            const inicio = new Date(data.fechaInicio ?? existing.fechaInicio);
            const fin = new Date(data.fechaFin ?? existing.fechaFin);
            if (!isAfter(fin, inicio)) {
                throw new Error('Error al modificar la sanción. El rango de fechas introducido es inválido');
            }
        }

        // 3. Validar levantamiento si se envía motivoLevantamiento
        if (data.motivoLevantamiento !== undefined && data.motivoLevantamiento !== null && data.motivoLevantamiento !== '') {
            const yaLevantada = existing.motivoLevantamiento !== null;
            const yaCaducada = !isAfter(new Date(existing.fechaFin), new Date());
            // Permite editar el motivoLevantamiento si la sanción ya está levantada.
            // Solo bloquea intentar levantar una sanción caducada que aún no fue levantada.
            if (!yaLevantada && yaCaducada) {
                throw new Error('No se puede levantar una sanción que ya ha caducado');
            }
        }

        // 4. Persistir
        return this.disciplineRepo.update(id, data);
    }
}