import { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator,
    ) {}

    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        await this.paymentValidator.validateMemberExists(data.member_id);
        this.paymentValidator.validateMonto(data.monto);
        this.paymentValidator.validateMes(data.mes);
        this.paymentValidator.validateAnio(data.anio);
        this.paymentValidator.validateFechaVencimiento(data.fecha_vencimiento);

        return this.paymentRepository.create(data);
    }
}
