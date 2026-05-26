import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lockers } from './Lockers';
import { lockersService } from '../services/lockers';
import { membersService } from '../services/members';
import { Provider } from '../components/ui/provider';

import type { LockerDTO, MemberDTO } from '@alentapp/shared';

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
  // Componente: Lockers.tsx -> fetchData() -> estado isLoading + lockers.length === 0
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

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Renderizado de la lista de lockers
  // Verifica que cuando el backend devuelve lockers, estos se muestran
  // correctamente en la tabla con todos sus datos.
  // Componente: Lockers.tsx -> fetchData() -> tabla con lockers.map(...)
  // ─────────────────────────────────────────────────────────────────
  it('debe renderizar la lista de lockers si el backend responde exitosamente', async () => {
    const mockLockers = [
      { id: '1', numero: 101, estado: 'Disponible', ubicacion: 'Vestuario Masculino', member_id: null },
      { id: '2', numero: 202, estado: 'Ocupado',    ubicacion: 'Vestuario Femenino',  member_id: 'abc-123' },
    ] as LockerDTO[];

    // Para el segundo locker que tiene member_id, también mockeamos el miembro
    const mockMembers = [
      { id: 'abc-123', name: 'Juan Perez', dni: '12345678', email: 'juan@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: new Date().toISOString() }
    ] as MemberDTO[];

    vi.mocked(lockersService.getAll).mockResolvedValueOnce(mockLockers);
    vi.mocked(membersService.getAll).mockResolvedValueOnce(mockMembers);

    renderWithProviders(<Lockers />);

    // Esperamos a que los datos se inyecten en el DOM
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
    });

    // Validamos el primer locker
    expect(screen.getByText('Vestuario Masculino')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();

    // Validamos el segundo locker
    expect(screen.getByText('202')).toBeInTheDocument();
    expect(screen.getByText('Vestuario Femenino')).toBeInTheDocument();
    expect(screen.getByText('Ocupado')).toBeInTheDocument();

    // Validamos que el nombre del miembro asignado se resuelve correctamente
    // Lockers.tsx usa members.find(m => m.id === locker.member_id)?.name
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });
  
  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Manejo de error del backend
  // Verifica que cuando el servicio falla, se muestra el mensaje de
  // error en pantalla en lugar de la tabla.
  // Componente: Lockers.tsx -> fetchData() -> catch -> setError(err.message)
  // ─────────────────────────────────────────────────────────────────
  it('debe renderizar un mensaje de error si el servicio backend falla', async () => {
    // Simulamos un error 500 en el servicio de lockers
    vi.mocked(lockersService.getAll).mockRejectedValueOnce(new Error('Servidor caído'));
    // members también puede fallar, pero el componente captura cualquiera de los dos
    vi.mocked(membersService.getAll).mockResolvedValueOnce([]);

    renderWithProviders(<Lockers />);

    // Esperamos a que se muestre el texto de error en pantalla
    await waitFor(() => {
      expect(screen.getByText('Servidor caído')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Crear un nuevo locker mediante el formulario
  // Verifica que al abrir el modal, completar el formulario y hacer
  // submit, se llama a lockersService.create con los datos correctos.
  // Componente: Lockers.tsx -> openCreateModal() -> handleSubmit() -> lockersService.create()
  // ─────────────────────────────────────────────────────────────────
  it('debe permitir crear un nuevo locker mediante el formulario', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    // Configuramos los mocks para todas las llamadas (create refresca la lista)
    vi.mocked(lockersService.getAll).mockResolvedValue([]);
    vi.mocked(membersService.getAll).mockResolvedValue([]);
    vi.mocked(lockersService.create).mockResolvedValueOnce({
      id: '3',
      numero: 101,
      estado: 'Disponible',
      ubicacion: 'Vestuario Masculino',
      member_id: null
    });

    // Mockeamos el alert del navegador que aparece al crear con éxito
    // Lockers.tsx hace alert("Locker creado con éxito") en handleSubmit()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<Lockers />);

    // Esperamos que termine de cargar
    await waitFor(() => {
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
    });

    // Hacemos click en "Nuevo Locker"
    const addButton = screen.getByText(/Nuevo Locker/i);
    await user.click(addButton);

    // Llenamos el formulario
    // Campo número: Lockers.tsx usa type="number" con placeholder "Ej. 101"
    const numeroInput = screen.getByPlaceholderText('Ej. 11');
    await user.clear(numeroInput);
    await user.type(numeroInput, '11');

    // Campo ubicación: Lockers.tsx usa placeholder "Ej. Vestuario Masculino"
    await user.type(screen.getByPlaceholderText('Ej. Vestuario Masculino'), 'Vestuario Masculino');

    // Clic en submit
    const submitButton = screen.getByText('Crear Locker');
    await user.click(submitButton);

    // Verificamos que el servicio create fue llamado con los datos correctos
    expect(lockersService.create).toHaveBeenCalledWith(expect.objectContaining({
      numero: 11,
      ubicacion: 'Vestuario Masculino'
    }));

    alertSpy.mockRestore();
  });

});