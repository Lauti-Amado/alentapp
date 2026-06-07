import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentRequest } from '@alentapp/shared';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { SoftDeletePaymentUseCase } from '../application/SoftDeletePaymentUseCase.js';
import { UpdatePaymentPayload, UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
        private readonly softDeletePaymentUseCase: SoftDeletePaymentUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const pagos = await this.getPaymentsUseCase.execute();
        return reply.status(200).send({ data: pagos });
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
            if (['El miembro no existe', 'El monto debe ser mayor a cero', 'El mes debe estar entre 1 y 12', 'El año del pago es inválido', 'Fecha de vencimiento inválida'].includes(message)) {
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
            const pago = await this.updatePaymentUseCase.execute(request.params.id, request.body ?? {});
            return reply.status(200).send({ data: pago });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';
            if (['No se puede modificar un pago cancelado', 'No se puede modificar un pago dado de baja'].includes(message)) {
                return reply.status(409).send({ error: message });
            }
            if (['El pago no existe', 'No se puede modificar el id del pago', 'No se puede modificar el socio asociado al pago', 'No se puede modificar el campo creado_el desde la edición general', 'No se puede modificar el campo deleted_at desde la edición general', 'El monto debe ser mayor a cero', 'El mes debe estar entre 1 y 12', 'El año del pago es inválido', 'Fecha de vencimiento inválida', 'Fecha de pago inválida', 'La fecha de pago es obligatoria', 'El estado del pago es inválido'].includes(message)) {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            await this.softDeletePaymentUseCase.execute(request.params.id);
            return reply.status(204).send();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';
            if (['El pago ya fue dado de baja', 'Solo se pueden dar de baja pagos cancelados'].includes(message)) {
                return reply.status(409).send({ error: message });
            }
            if (message === 'El pago no existe') {
                return reply.status(400).send({ error: message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}