import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLocker } from '../application/CreateLocker.js';
import { GetLockers } from '../application/GetLockers.js';
import { UpdateLocker } from '../application/UpdateLocker.js';
import { DeleteLocker } from '../application/DeleteLocker.js';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class LockerController {
    constructor(
        private readonly createLocker: CreateLocker,
        private readonly getLockersUseCase: GetLockers,
        private readonly updateLockerUseCase: UpdateLocker,
        private readonly deleteLockerUseCase: DeleteLocker
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];
        try {
            const lockers = await this.getLockersUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: lockers });
        } catch (error: unknown) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: "Error al obtener los lockers" });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const locker = await this.createLocker.execute(request.body);
            
            // Criterio de Aceptación: "Al finalizar, el sistema debe mostrar un mensaje de éxito."
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ 
                message: "Locker creado con éxito",
                data: locker 
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";
            
            if (errorMessage.includes('Ya existe un locker con ese número')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: errorMessage });
            }
            if (errorMessage.includes('obligatorio y debe ser válido')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: errorMessage });
            }

            // Error interno (BD caída, etc)
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string }, Body: UpdateLockerRequest }>, reply: FastifyReply) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const result = await this.updateLockerUseCase.execute(request.params.id, request.body);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: result });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";

            if (errorMessage.includes("no existe")) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes("Ya existe un locker con ese número")) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: errorMessage });
            }
            if (errorMessage.includes("estado Disponible")) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: errorMessage });
            }
            
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            await this.deleteLockerUseCase.execute(request.params.id);
            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";

            if (errorMessage.includes("no existe")) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: errorMessage });
            }
            
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}