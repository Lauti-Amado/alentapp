import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

type PaymentDTO = Awaited<ReturnType<UpdatePaymentUseCase['execute']>>;

describe('UpdatePaymentUseCase', () => {
    const mockPaymentRepository = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validateForbiddenUpdateFields: vi.fn(),
        validatePaymentUpdate: vi.fn(),
        validateEstado: vi.fn(),
    } as unknown as PaymentValidator;

    const useCase = new UpdatePaymentUseCase(mockPaymentRepository, mockPaymentValidator);

    const existingPayment: PaymentDTO = {
        id: 'payment-1',
        member_id: 'member-1',
        monto: 15000,
        mes: 5,
        anio: 2026,
        estado: 'Pendiente',
        fecha_vencimiento: '2026-05-10',
        fecha_pago: null,
        creado_el: '2026-05-01T00:00:00.000Z',
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockPaymentRepository.findById).mockResolvedValue(existingPayment);
    });

    it('debe modificar un Payment existente con datos válidos y llamar a repository.update', async () => {
        const updateData = {
            monto: 18000,
            mes: 6,
            anio: 2026,
            fecha_vencimiento: '2026-06-10',
        };
        vi.mocked(mockPaymentRepository.update).mockResolvedValueOnce({
            ...existingPayment,
            ...updateData,
        });

        const result = await useCase.execute(existingPayment.id, updateData);

        expect(mockPaymentValidator.validateForbiddenUpdateFields).toHaveBeenCalledWith(updateData);
        expect(mockPaymentValidator.validatePaymentUpdate).toHaveBeenCalledWith(updateData);
        expect(mockPaymentRepository.update).toHaveBeenCalledWith(existingPayment.id, {
            ...updateData,
            estado: 'Pendiente',
            fecha_pago: null,
        });
        expect(result.monto).toBe(18000);
        expect(result.mes).toBe(6);
    });

    it('debe marcar un pago como Pagado cuando incluye estado Pagado y fecha_pago válida', async () => {
        const updateData = {
            estado: 'Pagado' as const,
            fecha_pago: '2026-05-08',
        };
        vi.mocked(mockPaymentRepository.update).mockResolvedValueOnce({
            ...existingPayment,
            ...updateData,
            estado: 'Pagado',
        });

        const result = await useCase.execute(existingPayment.id, updateData);

        expect(mockPaymentValidator.validateEstado).toHaveBeenCalledWith('Pagado');
        expect(mockPaymentRepository.update).toHaveBeenCalledWith(existingPayment.id, {
            monto: undefined,
            mes: undefined,
            anio: undefined,
            fecha_vencimiento: undefined,
            estado: 'Pagado',
            fecha_pago: '2026-05-08',
        });
        expect(result.estado).toBe('Pagado');
        expect(result.fecha_pago).toBe('2026-05-08');
    });

    it('debe rechazar la modificación si el Payment no existe y no llamar a update', async () => {
        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('payment-inexistente', { monto: 18000 })).rejects.toThrow('El pago no existe');

        expect(mockPaymentRepository.update).not.toHaveBeenCalled();
    });

    it('debe rechazar pagos cancelados o dados de baja y no llamar a update', async () => {
        const closedPayments = [
            {
                payment: { ...existingPayment, estado: 'Cancelado' as const },
                expectedError: 'No se puede modificar un pago cancelado',
            },
            {
                payment: { ...existingPayment, deleted_at: '2026-05-20T00:00:00.000Z' },
                expectedError: 'No se puede modificar un pago dado de baja',
            },
        ];

        for (const { payment, expectedError } of closedPayments) {
            vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(payment);

            await expect(useCase.execute(payment.id, { monto: 18000 })).rejects.toThrow(expectedError);

            expect(mockPaymentRepository.update).not.toHaveBeenCalled();
        }
    });
});
