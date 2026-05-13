import { LockerRepository } from '../domain/LockerRepository.js';
import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';

export class CreateLocker {
    constructor(
        private readonly lockerRepository: LockerRepository
    ) {}

    async execute(data: CreateLockerRequest): Promise<LockerDTO> {
        // 1. Validar que el número sea válido y exista
        if (data.numero === undefined || data.numero === null || isNaN(data.numero)) {
            throw new Error('INVALID_NUMBER'); 
        }

        // 2. Validar que el número de locker no esté ya registrado
        const existingLocker = await this.lockerRepository.findByNumero(data.numero);
        if (existingLocker) {
            throw new Error('DUPLICATE_NUMBER');
        }

        // 3. Persistir la entidad
        return await this.lockerRepository.create(data);
    }
}