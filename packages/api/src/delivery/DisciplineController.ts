import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../application/CreateDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from '../application/UpdateDisciplineUseCase.js';
import { DeleteDisciplineUseCase } from '../application/DeleteDisciplineUseCase.js';
import { CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly getDisciplinesUseCase: GetDisciplinesUseCase,
        private readonly updateDisciplineUseCase: UpdateDisciplineUseCase,
        private readonly deleteDisciplineUseCase: DeleteDisciplineUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const sanciones = await this.getDisciplinesUseCase.execute();
        return reply.status(200).send({ data: sanciones });
    }

    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sancion = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: sancion });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";
            if (errorMessage.includes('no existe')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('suspensión total')) {
                return reply.status(409).send({ error: errorMessage });
            }
            if (errorMessage.includes('posterior')) {
                return reply.status(400).send({ error: errorMessage });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sancion = await this.updateDisciplineUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: sancion });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";
            if (errorMessage.includes('no existe')) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes('inválido') || errorMessage.includes('caducado')) {
                return reply.status(400).send({ error: errorMessage });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            await this.deleteDisciplineUseCase.execute(request.params.id);
            return reply.status(204).send();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";
            if (errorMessage.includes('no existe')) {
                return reply.status(404).send({ error: errorMessage });
            }
            return reply.status(500).send({ error: 'Error interno al intentar eliminar el registro, reintente más tarde' });
        }
    }
}