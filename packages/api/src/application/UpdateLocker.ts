import { LockerRepository } from '../domain/LockerRepository.js';
import { UpdateLockerRequest, LockerDTO } from '@alentapp/shared';

export class UpdateLocker {
    constructor(private readonly lockerRepository: LockerRepository) {}

    async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        // 1. Validar que el locker exista (404)
        const existingLocker = await this.lockerRepository.findById(id);
        if (!existingLocker) {
            const error = new Error("El locker solicitado no existe");
            (error as any).status = 404;
            throw error;
        }

        // 2. Validar que el número no esté duplicado (409)
        if (data.numero !== undefined && data.numero !== existingLocker.numero) {
            const duplicado = await this.lockerRepository.findByNumero(data.numero);
            if (duplicado) {
                const error = new Error("Ya existe un locker con ese número");
                (error as any).status = 409;
                throw error;
            }
        }

        // 3. Reglas de negocio de Asignación de Socios (400)
        if (data.member_id !== undefined && data.member_id !== null) {
            // Si le estamos asignando un socio y no estaba Disponible
            if (existingLocker.estado !== 'Disponible' && existingLocker.member_id !== data.member_id) {
                const error = new Error("Solo se pueden asignar lockers en estado Disponible");
                (error as any).status = 400;
                throw error;
            }
            // Consistencia de datos: Si tiene socio, está Ocupado
            data.estado = 'Ocupado';
        } else if (data.member_id === null) {
            // Si lo desasignamos, lo volvemos Disponible (salvo que manden Mantenimiento explícitamente)
            if (!data.estado) data.estado = 'Disponible';
        }

        return await this.lockerRepository.update(id, data);
    }
}