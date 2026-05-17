import { LockerRepository } from '../LockerRepository.js';

export class LockerValidator {
    constructor(private readonly lockerRepo: LockerRepository) {}

    async validateNumeroIsUnique(numero: number, excludeLockerId?: string): Promise<void> {
        const lockerWithSameNumero = await this.lockerRepo.findByNumero(numero);
        if (lockerWithSameNumero && lockerWithSameNumero.id !== excludeLockerId) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    validateNumero(numero: number): void {
        if (numero === undefined || numero === null || numero <= 0) {
            throw new Error('El número del locker es obligatorio y debe ser válido');
        }
    }
}