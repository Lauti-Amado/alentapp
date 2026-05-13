import { isAfter } from 'date-fns';
import { IDisciplineRepository } from '../domain/DisciplineRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { DisciplineDTO, CreateDisciplineRequest } from '@alentapp/shared';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: IDisciplineRepository,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        // 1. Validar rango de fechas
        if (!isAfter(new Date(data.fechaFin), new Date(data.fechaInicio))) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }

        // 2. Verificar que el socio exista
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error('El socio provisto no existe');
        }

        // 3. Verificar que no tenga una suspensión total activa
            const activeSuspension = await this.disciplineRepository.findActiveTotalSuspensionByMember(data.memberId);
            if (activeSuspension) {
                throw new Error(`El socio ${member.name} - DNI: ${member.dni} ya cuenta con una suspensión total vigente`);
            }

        // 4. Persistir
        return this.disciplineRepository.create(data);
    }
}