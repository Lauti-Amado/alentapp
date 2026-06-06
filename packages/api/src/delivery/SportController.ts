import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateSportUseCase } from '../application/CreateSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { GetSportByNameUseCase } from '../application/GetSportByNameUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error desconocido';
}

export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly getSportUseCase: GetSportsUseCase,
        private readonly getSportByNameUseCase: GetSportByNameUseCase,
        private readonly updateSportUseCase: UpdateSportUseCase,
        private readonly deleteSportUseCase: DeleteSportUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = _request.method;
        const route = _request.url.split('?')[0];
        try {
            const sports = await this.getSportUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: sports });
        } catch (error: unknown) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: getErrorMessage(error) });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

   async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            request.log.info('Creando el deporte');
            const sport = await this.createSportUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: sport });
        }  catch (error: unknown) {
            const message = getErrorMessage(error);

            if (message.includes('Ya existe un deporte con ese nombre')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '400' });
            return reply.status(400).send({ error: message });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

  async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { id } = request.params;
            const sport = await this.updateSportUseCase.execute(id, request.body);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: sport });
        } catch (error: unknown) {
            const message = getErrorMessage(error);

            if (message.includes('Ya existe un deporte con ese nombre')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '400' });
            return reply.status(400).send({ error: message });
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
        await this.deleteSportUseCase.execute(id);
        requestCounter.add(1, { method, route, status: '204' });
        return reply.status(204).send(); // No Content
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: message });
    } finally {
        requestDuration.record(Date.now() - start, { method, route });
    }
}
    
    async getByName(
        request: FastifyRequest<{ Params: { name: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.url.split('?')[0];
        try {
            const { name } = request.params;
            const sport = await this.getSportByNameUseCase.execute(name);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: sport });
        } catch (error: unknown) {
            const message = getErrorMessage(error);

            if (message.includes('no existe')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}