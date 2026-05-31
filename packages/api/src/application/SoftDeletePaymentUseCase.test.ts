import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoftDeletePaymentUseCase } from './SoftDeletePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';

type PaymentDTO = NonNullable<Awaited<ReturnType<PaymentRepository['findById']>>>;

describe('SoftDeletePaymentUseCase', () => {
    const mockPaymentRepository = {
        findById: vi.fn(),
        softDelete: vi.fn(),
    } as unknown as PaymentRepository;

    const useCase = new SoftDeletePaymentUseCase(mockPaymentRepository);

    const cancelledPayment: PaymentDTO = {
        id: 'payment-1',
        member_id: 'member-1',
        monto: 15000,
        mes: 5,
        anio: 2026,
        estado: 'Cancelado',
        fecha_vencimiento: '2026-05-10',
        fecha_pago: null,
        creado_el: '2026-05-01T00:00:00.000Z',
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe dar de baja un Payment cancelado existente y llamar a repository.softDelete', async () => {
        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(cancelledPayment);

        await useCase.execute(cancelledPayment.id);

        expect(mockPaymentRepository.softDelete).toHaveBeenCalledWith(cancelledPayment.id);
    });

    it('debe rechazar la baja si el Payment no existe y no llamar a softDelete', async () => {
        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('payment-inexistente')).rejects.toThrow('El pago no existe');

        expect(mockPaymentRepository.softDelete).not.toHaveBeenCalled();
    });

    it('debe rechazar la baja si el Payment ya fue dado de baja y no llamar a softDelete', async () => {
        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce({
            ...cancelledPayment,
            deleted_at: '2026-05-20T00:00:00.000Z',
        });

        await expect(useCase.execute(cancelledPayment.id)).rejects.toThrow('El pago ya fue dado de baja');

        expect(mockPaymentRepository.softDelete).not.toHaveBeenCalled();
    });

    it('debe rechazar la baja si el Payment no esta cancelado y no llamar a softDelete', async () => {
        for (const estado of ['Pendiente', 'Pagado'] as const) {
            vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce({
                ...cancelledPayment,
                estado,
            });

            await expect(useCase.execute(cancelledPayment.id)).rejects.toThrow(
                'Solo se pueden dar de baja pagos cancelados',
            );

            expect(mockPaymentRepository.softDelete).not.toHaveBeenCalled();
        }
    });
});
