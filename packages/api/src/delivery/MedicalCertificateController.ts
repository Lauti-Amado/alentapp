import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from '../application/GetMedicalCertificatesUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../application/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../application/DeleteMedicalCertificateUseCase.js';
import { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificatesUseCase: GetMedicalCertificatesUseCase,
        private readonly updateMedicalCertificateUseCase: UpdateMedicalCertificateUseCase,
        // private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const certificados = await this.getMedicalCertificatesUseCase.execute();
            return reply.status(200).send({ data: certificados });
        } catch {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const certificado = await this.createMedicalCertificateUseCase.execute(request.body);
            return reply.status(201).send({ data: certificado });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('posterior')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const certificadoMedico = await this.updateMedicalCertificateUseCase.execute(request.params.id, request.body);
            return reply.status(200).send({ data: certificadoMedico });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('miembro')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('rango de fechas')) {
                return reply.status(409).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}