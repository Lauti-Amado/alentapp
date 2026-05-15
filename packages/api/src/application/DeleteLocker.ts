import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteLocker {
    constructor(private readonly lockerRepository: LockerRepository) {}

    async execute(id: string): Promise<void> {
        const locker = await this.lockerRepository.findById(id);
        if (!locker) {
            const error = new Error("El locker solicitado no existe");
            (error as any).status = 404;
            throw error;
        }

        if (locker.estado === 'Ocupado' || locker.member_id !== null) {
            const error = new Error("No se puede eliminar un locker que se encuentra asignado a un socio.");
            (error as any).status = 400;
            throw error;
        }

        await this.lockerRepository.delete(id);
    }
}