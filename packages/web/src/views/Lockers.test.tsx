import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lockers } from './Lockers';
import { lockersService } from '../services/lockers';
import { membersService } from '../services/members';
import { Provider } from '../components/ui/provider';

import type { LockerDTO } from '@alentapp/shared';

// Mockeamos ambos servicios porque Lockers.tsx llama a los dos en fetchData()
vi.mock('../services/lockers', () => ({
  lockersService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../services/members', () => ({
  membersService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Lockers', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Estado de carga inicial y tabla vacía
  // Verifica que mientras se esperan los datos se muestra el spinner,
  // y que al resolverse sin datos se muestra el mensaje vacío.
  // Componente: Lockers.tsx → fetchData() → estado isLoading + lockers.length === 0
  // ─────────────────────────────────────────────────────────────────

  it('debe mostrar el estado de carga y luego renderizar una tabla vacía', async () => {
    // Simulamos que el backend no tiene lockers ni miembros
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([]);
    vi.mocked(membersService.getAll).mockResolvedValueOnce([]);

    renderWithProviders(<Lockers />);

    // Verificamos que aparece el texto de carga
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();

    // Esperamos a que la promesa se resuelva
    await waitFor(() => {
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
    });

    // Verificamos que se indica que no hay lockers
    expect(screen.getByText('No se encontraron lockers.')).toBeInTheDocument();
  });
});