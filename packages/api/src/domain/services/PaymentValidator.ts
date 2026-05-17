import { MemberRepository } from '../MemberRepository.js';

export class PaymentValidator {
    constructor(private readonly memberRepository: MemberRepository) {}

    async validateMemberExists(memberId: string): Promise<void> {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new Error('El miembro no existe');
        }
    }

    validateMonto(monto: number): void {
        if (!Number.isFinite(monto) || monto <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }

    validateMes(mes: number): void {
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
            throw new Error('El mes debe estar entre 1 y 12');
        }
    }

    validateAnio(anio: number): void {
        if (!Number.isInteger(anio) || anio < 1900 || anio > 2100) {
            throw new Error('El año del pago es inválido');
        }
    }

    validateFechaVencimiento(fechaVencimiento: string): void {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)) {
            throw new Error('Fecha de vencimiento inválida');
        }

        const date = new Date(`${fechaVencimiento}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) {
            throw new Error('Fecha de vencimiento inválida');
        }

        const normalizedDate = date.toISOString().split('T')[0];
        if (normalizedDate !== fechaVencimiento) {
            throw new Error('Fecha de vencimiento inválida');
        }
    }
}
