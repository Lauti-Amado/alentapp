import { FastifyReply, FastifyRequest } from 'fastify';
import { CreatePaymentRequest } from '@alentapp/shared';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { UpdatePaymentPayload, UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
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

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentPayload }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const pago = await this.updatePaymentUseCase.execute(id, request.body ?? {});
            return reply.status(200).send({ data: pago });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';

            if (
                message === 'No se puede modificar un pago cancelado' ||
                message === 'No se puede modificar un pago dado de baja'
            ) {
                return reply.status(409).send({ error: message });
            }

            if (
                message === 'El pago no existe' ||
                message === 'No se puede modificar el id del pago' ||
                message === 'No se puede modificar el socio asociado al pago' ||
                message === 'No se puede modificar el campo creado_el desde la edición general' ||
                message === 'No se puede modificar el campo deleted_at desde la edición general' ||
                message === 'El monto debe ser mayor a cero' ||
                message === 'El mes debe estar entre 1 y 12' ||
                message === 'El año del pago es inválido' ||
                message === 'Fecha de vencimiento inválida' ||
                message === 'Fecha de pago inválida' ||
                message === 'La fecha de pago es obligatoria' ||
                message === 'El estado del pago es inválido'
            ) {
                return reply.status(400).send({ error: message });
            }

            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
