import type { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const paymentsService = {
  async getAll(): Promise<PaymentDTO[]> {
    const response = await fetch(`${API_URL}/pagos`);
    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || 'Error al obtener los pagos');
    }
    const result = await response.json() as { data: PaymentDTO[] };
    return result.data;
  },

  async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/pagos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || 'Error al crear el pago');
    }
    const result = await response.json() as { data: PaymentDTO };
    return result.data;
  },
};
