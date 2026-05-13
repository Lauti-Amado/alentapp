import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../application/CreateDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../application/GetDisciplinesUseCase.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly getDisciplinesUseCase: GetDisciplinesUseCase
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const sanciones = await this.getDisciplinesUseCase.execute();
            return reply.status(200).send({ data: sanciones });
        } catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const sancion = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: sancion });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('suspensión total')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('posterior')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}