import { FastifyReply, FastifyRequest } from 'fastify';
import { CreatePaymentRequest } from '@alentapp/shared';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const pagos = await this.getPaymentsUseCase.execute();
            return reply.status(200).send({ data: pagos });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';
            return reply.status(500).send({ error: message });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const pago = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: pago });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';

            if (
                message === 'El miembro no existe' ||
                message === 'El monto debe ser mayor a cero' ||
                message === 'El mes debe estar entre 1 y 12' ||
                message === 'El año del pago es inválido' ||
                message === 'Fecha de vencimiento inválida'
            ) {
                return reply.status(400).send({ error: message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
