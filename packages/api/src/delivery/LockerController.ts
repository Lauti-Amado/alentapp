import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLocker } from '../application/CreateLocker.js';
import { GetLockers } from '../application/GetLockers.js';
import { CreateLockerRequest } from '@alentapp/shared';

export class LockerController {
    constructor(
        private readonly createLocker: CreateLocker,
        private readonly getLockersUseCase: GetLockers
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const lockers = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: lockers });
        } catch (error: any) {
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
        } catch (error: any) {
            if (error.message.includes('DUPLICATE_NUMBER')) {
                return reply.status(409).send({ error: "Ya existe un locker con ese número" });
            }
            
            if (error.message.includes('INVALID_NUMBER')) {
                return reply.status(400).send({ error: "El número del locker es obligatorio y debe ser válido" });
            }

            // Error interno (BD caída, etc)
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }
}