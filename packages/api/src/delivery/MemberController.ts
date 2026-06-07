import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMemberUseCase } from '../application/NewMemberUseCase.js';
import { GetMembersUseCase } from '../application/GetMembersUseCase.js';
import { GetMemberByDniUseCase } from '../application/GetMemberByDniUseCase.js';
import { UpdateMemberUseCase } from '../application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from '../application/DeleteMemberUseCase.js';
import { CreateMemberRequest, UpdateMemberRequest } from '@alentapp/shared';

export class MemberController {
    constructor(
        private readonly createMemberUseCase: CreateMemberUseCase,
        private readonly getMembersUseCase: GetMembersUseCase,
        private readonly getMemberByDniUseCase: GetMemberByDniUseCase,
        private readonly updateMemberUseCase: UpdateMemberUseCase,
        private readonly deleteMemberUseCase: DeleteMemberUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const socios = await this.getMembersUseCase.execute();
        return reply.status(200).send({ data: socios });
    }

    async create(
        request: FastifyRequest<{ Body: CreateMemberRequest }>,
        reply: FastifyReply,
    ) {
        const socio = await this.createMemberUseCase.execute(request.body);
        return reply.status(201).send({ data: socio });
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMemberRequest }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        const socio = await this.updateMemberUseCase.execute(id, request.body);
        return reply.status(200).send({ data: socio });
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const { id } = request.params;
        await this.deleteMemberUseCase.execute(id);
        return reply.status(204).send();
    }

    async getByDni(
        request: FastifyRequest<{ Params: { dni: string } }>,
        reply: FastifyReply,
    ) {
        const { dni } = request.params;
        const socio = await this.getMemberByDniUseCase.execute(dni);
        return reply.status(200).send({ data: socio });
    }
}