import { metrics } from '@opentelemetry/api';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CreatePaymentRequest } from '@alentapp/shared';
import { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { SoftDeletePaymentUseCase } from '../application/SoftDeletePaymentUseCase.js';
import { UpdatePaymentPayload, UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
        private readonly softDeletePaymentUseCase: SoftDeletePaymentUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];
        try {
            const pagos = await this.getPaymentsUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: pagos });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: message });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const pago = await this.createPaymentUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
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
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentPayload }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;
            const pago = await this.updatePaymentUseCase.execute(id, request.body ?? {});
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: pago });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';

            if (
                message === 'No se puede modificar un pago cancelado' ||
                message === 'No se puede modificar un pago dado de baja'
            ) {
                errorCounter.add(1, { method, route, status: '409' });
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
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;
            await this.softDeletePaymentUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error interno, reintente más tarde';

            if (
                message === 'El pago ya fue dado de baja' ||
                message === 'Solo se pueden dar de baja pagos cancelados'
            ) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }

            if (message === 'El pago no existe') {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}