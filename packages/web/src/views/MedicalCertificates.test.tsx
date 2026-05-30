// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificatesView } from './MedicalCertificates';
import { medicalCertificatesService } from '../services/medicalCertificates';
import { membersService } from '../services/members';
import { Provider } from '../components/ui/provider';

import type { MedicalCertificateDTO, MemberDTO } from '@alentapp/shared';

vi.mock('../services/medicalCertificates', () => ({
  medicalCertificatesService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../services/members', () => ({
  membersService: {
    getAll: vi.fn(),
    getByDni: vi.fn(), 
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('MedicalCertificates', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TEST 1: Verifica el renderizado correcto con datos del backend
  it('debe renderizar la lista de certificados médicos si el backend responde exitosamente', async () => {
    const mockMedicalCertificates = [
      { id: '1', fecha_emision: "2022-06-18T00:00:00.000Z", fecha_vencimiento: "2022-07-18T00:00:00.000Z", licencia_doctor: '98/1821', esta_validada: true, member_id: "12" },
      { id: '2', fecha_emision: "2022-06-18T00:00:00.000Z", fecha_vencimiento: "2022-07-18T00:00:00.000Z", licencia_doctor: '77/4321', esta_validada: true, member_id: "13" },
    ] as MedicalCertificateDTO[];

    const mockMembers = [
      { id: "12", name: 'Juan Perez', dni: '12345678', email: 'juan@test.com', birthdate: '2000-01-01', category: 'Pleno', status: 'Activo', created_at: new Date().toISOString() },
      { id: "13", name: 'Maria Gonzales', dni: '87654321', email: 'maria@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: new Date().toISOString() },
    ] as MemberDTO[];

    vi.mocked(medicalCertificatesService.getAll).mockResolvedValueOnce(mockMedicalCertificates);
    vi.mocked(membersService.getAll).mockResolvedValueOnce(mockMembers);

    renderWithProviders(<MedicalCertificatesView />);

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });

    expect(screen.getByText('Maria Gonzales')).toBeInTheDocument();
    expect(screen.getByText('98/1821')).toBeInTheDocument();
    expect(screen.getByText('77/4321')).toBeInTheDocument();
  });

  // TEST 2: Flujo de creación mediante el formulario del Modal con búsqueda por DNI
  it('debe permitir crear un nuevo certificado médico mediante el formulario', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    // Mockeamos las respuestas de inicialización de la vista
    vi.mocked(medicalCertificatesService.getAll).mockResolvedValue([]);
    vi.mocked(membersService.getAll).mockResolvedValue([]);

    // Mockeamos el socio específico que va a devolver la búsqueda por DNI
    const mockSocio = { id: "11", name: 'Carlos Tevez', dni: '44444444', category: 'Pleno', status: 'Activo' } as MemberDTO;
    vi.mocked(membersService.getByDni).mockResolvedValueOnce(mockSocio);

    vi.mocked(medicalCertificatesService.create).mockResolvedValueOnce({
      id: '3',
      fecha_emision: "2026-06-19T00:00:00.000Z",
      fecha_vencimiento: "2026-07-19T00:00:00.000Z",
      licencia_doctor: '98/1821',
      esta_validada: true,
      member_id: "11"
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    renderWithProviders(<MedicalCertificatesView />);

    // 1. Abrir el modal de registro
    const addButton = await screen.findByText(/Registrar Certificado Médico/i);
    await user.click(addButton);

    // 2. Ejecutar el flujo de búsqueda por DNI (Requisito de tu vista para habilitar el Submit)
    const dniInput = screen.getByPlaceholderText(/Ej. 12345678/i);
    await user.type(dniInput, '44444444');

    const searchButton = screen.getByRole('button', { name: /buscar/i });
    await user.click(searchButton);

    // Esperamos a que la UI refleje el éxito de la búsqueda (el cartel verde con el nombre del socio)
    await waitFor(() => {
      expect(screen.getByText(/Carlos Tevez/i)).toBeInTheDocument();
    });

    // 3. Completar el campo obligatorio: Licencia del médico
    const licenciaInput = screen.getByPlaceholderText(/Ej. 38190192/i);
    await user.type(licenciaInput, '98/1821');

    // 4. Completar las fechas requeridas usando selectores nativos directos del DOM
    const allInputs = document.querySelectorAll('input[type="date"]');
    await user.type(allInputs[0], '2026-06-19'); // Fecha de emisión
    await user.type(allInputs[1], '2026-07-19'); // Fecha de vencimiento

    // 5. Enviar el formulario haciendo click en el botón de confirmación
    const submitButton = screen.getByRole('button', { name: 'Registrar Certificado Médico' });
    await user.click(submitButton);

    // 6. Validación asíncrona del backend service
    await waitFor(() => {
      expect(medicalCertificatesService.create).toHaveBeenCalled();
    });

    const mockCalls = vi.mocked(medicalCertificatesService.create).mock.calls;
    const actualPayload = mockCalls[0][0];

    // Verificamos los campos críticos transformados a ISO por la lógica de tu handleSubmit
    expect(String(actualPayload.member_id)).toBe('11');
    expect(actualPayload.licencia_doctor).toBe('98/1821');

    alertSpy.mockRestore();
  });
});