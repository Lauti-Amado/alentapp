import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteLocker {
    constructor(private readonly lockerRepository: LockerRepository) {}

    async execute(id: string): Promise<void> {
        // Validar existencia del locker
        const existingLocker = await this.lockerRepository.findById(id);
        if (!existingLocker) {
            throw new Error("El locker solicitado no existe");
        }

        // Ejecutar eliminación
        await this.lockerRepository.delete(id);
    }
}