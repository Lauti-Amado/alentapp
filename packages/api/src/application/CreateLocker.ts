import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';

export class CreateLocker {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator
    ) {}

    async execute(data: CreateLockerRequest): Promise<LockerDTO> {
        // 1. Validar que el número sea válido y exista
        this.lockerValidator.validateNumero(data.numero);
        await this.lockerValidator.validateNumeroIsUnique(data.numero);

        // 2. Persistencia a través de la interfaz
        const nuevoLocker = await this.lockerRepository.create({
            ...data,
            estado: 'Disponible', // Todos nacen disponibles
            member_id: null,      // Nacen sin socio asignado
        });

        return nuevoLocker;
    }
}