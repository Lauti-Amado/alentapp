import type { CreateLockerRequest, LockerDTO, UpdateLockerRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const lockersService = {
    async getAll(): Promise<LockerDTO[]> {
        const response = await fetch(`${API_URL}/lockers`);
        if (!response.ok) {
            throw new Error('Error al obtener los lockers');
        }
        const result = await response.json();
        return result.data;
    },

    async create(data: CreateLockerRequest): Promise<LockerDTO> {
        const response = await fetch(`${API_URL}/lockers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el locker');
        }

        const result = await response.json();
        return result.data;
    },

    async update(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        const response = await fetch(`${API_URL}/lockers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar el locker');
        }
        const result = await response.json();
        return result.data;
    },

    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/lockers/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar el locker');
        }
    }
};