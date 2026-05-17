import { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';

export interface PaymentRepository {
    create(data: CreatePaymentRequest): Promise<PaymentDTO>;
    findAll(): Promise<PaymentDTO[]>;
}
