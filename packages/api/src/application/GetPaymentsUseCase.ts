import { PaymentDTO } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';

export class GetPaymentsUseCase {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async execute(): Promise<PaymentDTO[]> {
        return this.paymentRepository.findAll();
    }
}
