import { PaymentRepository } from '../domain/PaymentRepository.js';

export class SoftDeletePaymentUseCase {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async execute(id: string): Promise<void> {
        const existingPayment = await this.paymentRepository.findById(id);
        if (!existingPayment) {
            throw new Error('El pago no existe');
        }

        if (existingPayment.deleted_at !== null) {
            throw new Error('El pago ya fue dado de baja');
        }

        if (existingPayment.estado !== 'Cancelado') {
            throw new Error('Solo se pueden dar de baja pagos cancelados');
        }

        await this.paymentRepository.softDelete(id);
    }
}
