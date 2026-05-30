// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { MedicalCertificatesView } from './MedicalCertificates';
import { medicalCertificatesService } from '../services/medicalCertificates';
import { membersService } from '../services/members';
import { Provider } from '../components/ui/provider';

import type { MedicalCertificateDTO, MemberDTO } from '@alentapp/shared';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

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
      { id: '1', fecha_emision: "2022-06-18", fecha_vencimiento: "2022-07-18", licencia_doctor: '98/1821', esta_validada: true, member_id: "12" },
      { id: '2', fecha_emision: "2022-06-18", fecha_vencimiento: "2022-07-18", licencia_doctor: '98/1821', esta_validada: true, member_id: "13" },
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

    expect(screen.getByText('juan@test.com')).toBeInTheDocument();
    expect(screen.getByText('Maria Gonzales')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
  });

  // TEST 2: Flujo de creación mediante el formulario del Modal
  it('debe permitir crear un nuevo certificado médico mediante el formulario', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    vi.mocked(medicalCertificatesService.getAll).mockResolvedValue([]);
    vi.mocked(membersService.getAll).mockResolvedValue([]);
    vi.mocked(medicalCertificatesService.create).mockResolvedValueOnce({
      id: '3',
      fecha_emision: "2022-06-18",
      fecha_vencimiento: "2022-07-18",
      licencia_doctor: '98/1821',
      esta_validada: true, 
      member_id: "12"
    });
    
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<MedicalCertificatesView />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
    });

    const addButton = screen.getByText(/Registrar Certificado Médico/i);
    await user.click(addButton);

    const memberIdInput = screen.getByPlaceholderText('Ej. 11');
    await user.clear(memberIdInput);
    await user.type(memberIdInput, '11');

    const dateInput = screen.getByPlaceholderText('Ej. Fecha Emision');
    await user.type(dateInput, '2026-06-19');

    const submitButton = screen.getByText('Crear Certificado Médico');
    await user.click(submitButton);

    expect(medicalCertificatesService.create).toHaveBeenCalledWith(expect.objectContaining({
      member_id: '11',
      fecha_emision: '2026-06-19'
    }));

    alertSpy.mockRestore();
  });
});