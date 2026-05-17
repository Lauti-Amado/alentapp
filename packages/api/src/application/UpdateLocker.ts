import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { UpdateLockerRequest, LockerDTO } from '@alentapp/shared';

export class UpdateLocker {
    constructor(private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator
    ) {}

    async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        // 1. Validar que el locker exista (404)
        const existingLocker = await this.lockerRepository.findById(id);
        if (!existingLocker) {
            throw new Error("El locker solicitado no existe");
        }

        // 2. Validar que el número no esté duplicado (409)
        if (data.numero !== undefined && data.numero !== existingLocker.numero) {
            await this.lockerValidator.validateNumeroIsUnique(data.numero, id);
        }

        let finalData = { ...data };

        // 3. Reglas de negocio de Asignación de Socios (400)
        if (finalData.member_id !== undefined && finalData.member_id !== null) {
            if (existingLocker.estado !== 'Disponible' && existingLocker.member_id !== finalData.member_id) {
                throw new Error("Solo se pueden asignar lockers en estado Disponible");
            }
            finalData.estado = 'Ocupado';
        } else if (finalData.member_id === null) {
            if (!finalData.estado) finalData.estado = 'Disponible';
        }

        return await this.lockerRepository.update(id, finalData);
    }
}