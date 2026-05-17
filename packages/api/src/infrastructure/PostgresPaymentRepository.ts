import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { CreatePaymentRequest, PaymentDTO, PaymentStatus } from '@alentapp/shared';
import { PaymentRepository } from '../domain/PaymentRepository.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBPayment = {
    id: string;
    member_id: string;
    monto: number;
    mes: number;
    anio: number;
    estado: PaymentStatus;
    fecha_vencimiento: Date;
    fecha_pago: Date | null;
    creado_el: Date;
    deleted_at: Date | null;
};

export class PostgresPaymentRepository implements PaymentRepository {
    async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
        const payment = await prisma.payment.create({
            data: {
                member_id: data.member_id,
                monto: data.monto,
                mes: data.mes,
                anio: data.anio,
                fecha_vencimiento: new Date(`${data.fecha_vencimiento}T00:00:00.000Z`),
            },
        });

        return this.mapToDTO(payment as DBPayment);
    }

    async findAll(): Promise<PaymentDTO[]> {
        const payments = await prisma.payment.findMany({
            where: { deleted_at: null },
            orderBy: { creado_el: 'desc' },
        });

        return payments.map((payment) => this.mapToDTO(payment as DBPayment));
    }

    private mapToDTO(payment: DBPayment): PaymentDTO {
        return {
            id: payment.id,
            member_id: payment.member_id,
            monto: payment.monto,
            mes: payment.mes,
            anio: payment.anio,
            estado: payment.estado,
            fecha_vencimiento: payment.fecha_vencimiento.toISOString().split('T')[0],
            fecha_pago: payment.fecha_pago ? payment.fecha_pago.toISOString().split('T')[0] : null,
            creado_el: payment.creado_el.toISOString(),
            deleted_at: payment.deleted_at ? payment.deleted_at.toISOString() : null,
        };
    }
}
