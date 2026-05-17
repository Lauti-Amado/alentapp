import { PaymentDTO, PaymentStatus, UpdatePaymentRequest } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentUpdateForbiddenFields, PaymentValidator } from '../domain/services/PaymentValidator.js';

export type UpdatePaymentPayload = Omit<UpdatePaymentRequest, 'estado'> & {
    estado?: string;
} & PaymentUpdateForbiddenFields;

export class UpdatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator,
    ) {}

    async execute(id: string, data: UpdatePaymentPayload): Promise<PaymentDTO> {
        this.paymentValidator.validateForbiddenUpdateFields(data);

        const existingPayment = await this.paymentRepository.findById(id);
        if (!existingPayment) {
            throw new Error('El pago no existe');
        }

        if (existingPayment.estado === 'Cancelado') {
            throw new Error('No se puede modificar un pago cancelado');
        }

        if (existingPayment.deleted_at !== null) {
            throw new Error('No se puede modificar un pago dado de baja');
        }

        this.paymentValidator.validatePaymentUpdate(data);

        const nextEstado = this.getNextEstado(data.estado, existingPayment.estado);
        const nextFechaPago = data.fecha_pago ?? existingPayment.fecha_pago;
        if (nextEstado === 'Pagado' && !nextFechaPago) {
            throw new Error('La fecha de pago es obligatoria');
        }

        const updateData: UpdatePaymentRequest = {
            monto: data.monto,
            mes: data.mes,
            anio: data.anio,
            fecha_vencimiento: data.fecha_vencimiento,
            fecha_pago: data.fecha_pago,
            estado: nextEstado,
        };

        return this.paymentRepository.update(id, updateData);
    }

    private getNextEstado(estado: string | undefined, currentEstado: PaymentStatus): PaymentStatus {
        if (estado === undefined) {
            return currentEstado;
        }

        this.paymentValidator.validateEstado(estado);
        return estado;
    }
}
