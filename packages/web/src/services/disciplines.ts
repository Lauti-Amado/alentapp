import type { DisciplineDTO, CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const disciplinesService = {
    async getAll(): Promise<DisciplineDTO[]> {
        const response = await fetch(`${API_URL}/disciplines`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cargar las sanciones');
        }
        const result = await response.json();
        return result.data;
    },

    async create(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        const response = await fetch(`${API_URL}/disciplines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al registrar la sanción');
        }
        const result = await response.json();
        return result.data;
    },

    async update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        const response = await fetch(`${API_URL}/disciplines/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al modificar la sanción');
        }
        const result = await response.json();
        return result.data;
    }
};