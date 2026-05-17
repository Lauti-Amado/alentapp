import { PaymentStatus, UpdatePaymentRequest } from '@alentapp/shared';
import { MemberRepository } from '../MemberRepository.js';

export type PaymentUpdateForbiddenFields = Partial<Record<'id' | 'member_id' | 'creado_el' | 'deleted_at', unknown>>;
type PaymentUpdateValidationData = Omit<UpdatePaymentRequest, 'estado'> & { estado?: string };

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
        this.validateIsoDate(fechaVencimiento, 'Fecha de vencimiento inválida');
    }

    validateFechaPago(fechaPago: string): void {
        this.validateIsoDate(fechaPago, 'Fecha de pago inválida');
    }

    validateEstado(estado: string): asserts estado is PaymentStatus {
        if (!['Pendiente', 'Pagado', 'Cancelado'].includes(estado)) {
            throw new Error('El estado del pago es inválido');
        }
    }

    validateForbiddenUpdateFields(data: PaymentUpdateForbiddenFields): void {
        if ('id' in data) {
            throw new Error('No se puede modificar el id del pago');
        }
        if ('member_id' in data) {
            throw new Error('No se puede modificar el socio asociado al pago');
        }
        if ('creado_el' in data) {
            throw new Error('No se puede modificar el campo creado_el desde la edición general');
        }
        if ('deleted_at' in data) {
            throw new Error('No se puede modificar el campo deleted_at desde la edición general');
        }
    }

    validatePaymentUpdate(data: PaymentUpdateValidationData): void {
        if (data.monto !== undefined) {
            this.validateMonto(data.monto);
        }
        if (data.mes !== undefined) {
            this.validateMes(data.mes);
        }
        if (data.anio !== undefined) {
            this.validateAnio(data.anio);
        }
        if (data.fecha_vencimiento !== undefined) {
            this.validateFechaVencimiento(data.fecha_vencimiento);
        }
        if (data.fecha_pago !== undefined) {
            this.validateFechaPago(data.fecha_pago);
        }
        if (data.estado !== undefined) {
            this.validateEstado(data.estado);
        }
    }

    private validateIsoDate(value: string, errorMessage: string): void {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error(errorMessage);
        }

        const date = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) {
            throw new Error(errorMessage);
        }

        const normalizedDate = date.toISOString().split('T')[0];
        if (normalizedDate !== value) {
            throw new Error(errorMessage);
        }
    }
}
