import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLocker } from '../application/CreateLocker.js';
import { GetLockers } from '../application/GetLockers.js';
import { UpdateLocker } from '../application/UpdateLocker.js';
import { DeleteLocker } from '../application/DeleteLocker.js';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';

export class LockerController {
    constructor(
        private readonly createLocker: CreateLocker,
        private readonly getLockersUseCase: GetLockers,
        private readonly updateLockerUseCase: UpdateLocker,
        private readonly deleteLockerUseCase: DeleteLocker
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const lockers = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: lockers });
        } catch (error: unknown) {
            return reply.status(500).send({ error: "Error al obtener los lockers" });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const locker = await this.createLocker.execute(request.body);
            
            // Criterio de Aceptación: "Al finalizar, el sistema debe mostrar un mensaje de éxito."
            return reply.status(201).send({ 
                message: "Locker creado con éxito",
                data: locker 
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";
            
            if (errorMessage.includes('Ya existe un locker con ese número')) {
                return reply.status(409).send({ error: errorMessage });
            }
            if (errorMessage.includes('obligatorio y debe ser válido')) {
                return reply.status(400).send({ error: errorMessage });
            }

            // Error interno (BD caída, etc)
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string }, Body: UpdateLockerRequest }>, reply: FastifyReply) {
        try {
            const result = await this.updateLockerUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: result });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";

            if (errorMessage.includes("no existe")) {
                return reply.status(404).send({ error: errorMessage });
            }
            if (errorMessage.includes("Ya existe un locker con ese número")) {
                return reply.status(409).send({ error: errorMessage });
            }
            if (errorMessage.includes("estado Disponible")) {
                return reply.status(400).send({ error: errorMessage });
            }
            
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            await this.deleteLockerUseCase.execute(request.params.id);
            return reply.status(204).send();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error interno";

            if (errorMessage.includes("no existe")) {
                return reply.status(404).send({ error: errorMessage });
            }
            
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }
}