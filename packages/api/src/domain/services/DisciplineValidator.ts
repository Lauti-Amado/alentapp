import { isAfter } from 'date-fns';
import { IDisciplineRepository } from '../DisciplineRepository.js';
import { MemberRepository } from '../MemberRepository.js';
import { DisciplineDTO, MemberDTO, UpdateDisciplineRequest } from '@alentapp/shared';

export class DisciplineValidator {
    constructor(
        private readonly disciplineRepo: IDisciplineRepository,
        private readonly memberRepo: MemberRepository,
    ) {}

    validateDateRange(fechaInicio: string, fechaFin: string): void {
        if (!isAfter(new Date(fechaFin), new Date(fechaInicio))) {
            throw new Error('La fecha de fin debe ser posterior a la de inicio');
        }
    }

    async validateMemberExists(memberId: string): Promise<MemberDTO> {
        const member = await this.memberRepo.findById(memberId);
        if (!member) {
            throw new Error('El socio provisto no existe');
        }
        return member;
    }

    async validateNoActiveTotalSuspension(memberId: string, memberName: string, memberDni: string): Promise<void> {
        const activeSuspension = await this.disciplineRepo.findActiveTotalSuspensionByMember(memberId);
        if (activeSuspension) {
            throw new Error(`El socio ${memberName} - DNI: ${memberDni} ya cuenta con una suspensión total vigente`);
        }
    }

    async validateDisciplineExists(id: string): Promise<DisciplineDTO> {
        const discipline = await this.disciplineRepo.findById(id);
        if (!discipline) {
            throw new Error('El registro de sanción no existe');
        }
        return discipline;
    }

    validateDateRangeForUpdate(data: UpdateDisciplineRequest, existing: DisciplineDTO): void {
        if (data.fechaInicio !== undefined || data.fechaFin !== undefined) {
            const inicio = new Date(data.fechaInicio ?? existing.fechaInicio);
            const fin = new Date(data.fechaFin ?? existing.fechaFin);
            if (!isAfter(fin, inicio)) {
                throw new Error('Error al modificar la sanción. El rango de fechas introducido es inválido');
            }
        }
    }

    validateLevantamiento(existing: DisciplineDTO, motivoLevantamiento: string | null | undefined): void {
        if (motivoLevantamiento !== undefined && motivoLevantamiento !== null && motivoLevantamiento !== '') {
            const yaLevantada = existing.motivoLevantamiento !== null;
            const yaCaducada = !isAfter(new Date(existing.fechaFin), new Date());
            if (!yaLevantada && yaCaducada) {
                throw new Error('No se puede levantar una sanción que ya ha caducado');
            }
        }
    }
}