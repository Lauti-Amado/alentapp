import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from './CreatePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

type CreatePaymentRequest = Parameters<CreatePaymentUseCase['execute']>[0];
type PaymentDTO = Awaited<ReturnType<CreatePaymentUseCase['execute']>>;

describe('CreatePaymentUseCase', () => {
    const mockPaymentRepository = {
        create: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validateMemberExists: vi.fn(),
        validateMonto: vi.fn(),
        validateMes: vi.fn(),
        validateAnio: vi.fn(),
        validateFechaVencimiento: vi.fn(),
    } as unknown as PaymentValidator;

    const useCase = new CreatePaymentUseCase(mockPaymentRepository, mockPaymentValidator);

    const validPayload: CreatePaymentRequest = {
        member_id: 'member-1',
        monto: 15000,
        mes: 5,
        anio: 2026,
        fecha_vencimiento: '2026-05-10',
    };

    const createdPayment: PaymentDTO = {
        id: 'payment-1',
        ...validPayload,
        estado: 'Pendiente',
        fecha_pago: null,
        creado_el: '2026-05-01T00:00:00.000Z',
        deleted_at: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un pago si valida socio, monto, mes, año y fecha de vencimiento', async () => {
        vi.mocked(mockPaymentRepository.create).mockResolvedValueOnce(createdPayment);

        const result = await useCase.execute(validPayload);

        expect(mockPaymentValidator.validateMemberExists).toHaveBeenCalledWith(validPayload.member_id);
        expect(mockPaymentValidator.validateMonto).toHaveBeenCalledWith(validPayload.monto);
        expect(mockPaymentValidator.validateMes).toHaveBeenCalledWith(validPayload.mes);
        expect(mockPaymentValidator.validateAnio).toHaveBeenCalledWith(validPayload.anio);
        expect(mockPaymentValidator.validateFechaVencimiento).toHaveBeenCalledWith(validPayload.fecha_vencimiento);
        expect(mockPaymentRepository.create).toHaveBeenCalledWith(validPayload);
        expect(result).toEqual(createdPayment);
    });

    it('debe rechazar el alta si el socio no existe y no crear el pago', async () => {
        vi.mocked(mockPaymentValidator.validateMemberExists).mockRejectedValueOnce(new Error('El miembro no existe'));

        await expect(useCase.execute(validPayload)).rejects.toThrow('El miembro no existe');

        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });

    it('debe rechazar monto cero o negativo y no crear el pago', async () => {
        vi.mocked(mockPaymentValidator.validateMonto).mockImplementationOnce(() => {
            throw new Error('El monto debe ser mayor a cero');
        });

        await expect(useCase.execute({ ...validPayload, monto: 0 })).rejects.toThrow('El monto debe ser mayor a cero');
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();

        vi.clearAllMocks();
        vi.mocked(mockPaymentValidator.validateMonto).mockImplementationOnce(() => {
            throw new Error('El monto debe ser mayor a cero');
        });

        await expect(useCase.execute({ ...validPayload, monto: -1 })).rejects.toThrow('El monto debe ser mayor a cero');
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });

    it('debe rechazar período o fecha de vencimiento inválida y no crear el pago', async () => {
        vi.mocked(mockPaymentValidator.validateMes).mockImplementationOnce(() => {
            throw new Error('El mes debe estar entre 1 y 12');
        });

        await expect(useCase.execute({ ...validPayload, mes: 13 })).rejects.toThrow('El mes debe estar entre 1 y 12');
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();

        vi.clearAllMocks();
        vi.mocked(mockPaymentValidator.validateAnio).mockImplementationOnce(() => {
            throw new Error('El año del pago es inválido');
        });

        await expect(useCase.execute({ ...validPayload, anio: 1800 })).rejects.toThrow('El año del pago es inválido');
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();

        vi.clearAllMocks();
        vi.mocked(mockPaymentValidator.validateFechaVencimiento).mockImplementationOnce(() => {
            throw new Error('Fecha de vencimiento inválida');
        });

        await expect(useCase.execute({ ...validPayload, fecha_vencimiento: '2026-02-31' })).rejects.toThrow(
            'Fecha de vencimiento inválida',
        );
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });
});
