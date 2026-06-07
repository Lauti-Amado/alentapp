import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateSportUseCase } from '../application/CreateSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { GetSportByNameUseCase } from '../application/GetSportByNameUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

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
        const sports = await this.getSportUseCase.execute();
        return reply.status(200).send({ data: sports });
    }

    async create(request: FastifyRequest<{ Body: CreateSportRequest }>, reply: FastifyReply) {
        try {
            const sport = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: sport });
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            if (message.includes('Ya existe un deporte con ese nombre')) return reply.status(409).send({ error: message });
            return reply.status(400).send({ error: message });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>, reply: FastifyReply) {
        try {
            const sport = await this.updateSportUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: sport });
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            if (message.includes('Ya existe un deporte con ese nombre')) return reply.status(409).send({ error: message });
            return reply.status(400).send({ error: message });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            await this.deleteSportUseCase.execute(request.params.id);
            return reply.status(204).send();
        } catch (error: unknown) {
            return reply.status(400).send({ error: getErrorMessage(error) });
        }
    }
    
    async getByName(request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) {
        try {
            const sport = await this.getSportByNameUseCase.execute(request.params.name);
            return reply.status(200).send({ data: sport });
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            if (message.includes('no existe')) return reply.status(404).send({ error: message });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}