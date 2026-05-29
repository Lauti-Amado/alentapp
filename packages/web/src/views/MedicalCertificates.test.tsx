import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificatesView } from './MedicalCertificates';
import { medicalCertificatesService } from '../services/medicalCertificates';
import { membersService } from '../services/members';
import { Provider } from '../components/ui/provider';

import type { MedicalCertificateDTO, MemberDTO } from '@alentapp/shared';

// Mockeamos ambos servicios porque Lockers.tsx llama a los dos en fetchData()
vi.mock('../services/medical_certificates', () => ({
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
  // TEST 1: Verifica que los certificados médicos devueltos del backend se renderizen correctamente con todos sus datos
  it('debe renderizar la lista de certificados médicos si el backend responde exitosamente', async () => {
    const mockMedicalCertificates = [
      { id: '1', fecha_emision: "2022-06-18", fecha_vencimiento: "2022-07-18", licencia_doctor: '98/1821', esta_validada: true, member_id: "12" },
      { id: '2', fecha_emision: "2022-06-18", fecha_vencimiento: "2022-07-18", licencia_doctor: '98/1821',  esta_validada: true, member_id: "13" },
    ] as MedicalCertificateDTO[];

    // Para el segundo locker que tiene member_id, también mockeamos el miembro
    const mockMembers = [
      { id: "12", name: 'Juan Perez', dni: '12345678', email: 'juan@test.com', birthdate: '2000-01-01', category: 'Pleno', status: 'Activo', created_at: new Date().toISOString() },
      { id: "13", name: 'Maria Gonzales', dni: '87654321', email: 'maria@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: new Date().toISOString() },
    ] as MemberDTO[];

    vi.mocked(medicalCertificatesService.getAll).mockResolvedValueOnce(mockMedicalCertificates);
    vi.mocked(membersService.getAll).mockResolvedValueOnce(mockMembers);

    renderWithProviders(<MedicalCertificatesView />);

    // Esperamos a que los datos se inyecten en el DOM
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    // Validamos el primer MedicalCertificate
    expect(screen.getByText('juan@test.com')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();

    // Validamos el segundo MedicalCertificate
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
    expect(screen.getByText('Maria Gonzales')).toBeInTheDocument();
  });

  // TEST 2: Verifica que al abrir el modal, completar el formulario y guardar se llame a medicalCertificatesService.create
  
  it('debe permitir crear un nuevo certificado médico mediante el formulario', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    // Configuramos los mocks para todas las llamadas (create refresca la lista)
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
    // Mockeamos el alert del navegador que aparece al crear con éxito
    // MedicalCertificatesView.tsx hace alert("Medical Certificate creado con éxito") en handleSubmit()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<MedicalCertificatesView />);

    // Esperamos que termine de cargar
    await waitFor(() => {
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
    });

    // Hacemos click en "Nuevo Certificado Médico"
    const addButton = screen.getByText(/Nuevo Certificado Médico/i);
    await user.click(addButton);

    // Llenamos el formulario
    // Campo número: Lockers.tsx usa type="number" con placeholder "Ej. 11"
    const member_id = screen.getByPlaceholderText('Ej. 11');
    await user.clear(member_id);
    await user.type(member_id, '11');

    // Campo fecha_emision
    await user.type(screen.getByPlaceholderText('Ej. Fecha Emision'), '2026-06-19');

    // Clic en submit
    const submitButton = screen.getByText('Crear Certificado Médico');
    await user.click(submitButton);

    // Verificamos que el servicio create fue llamado con los datos correctos
    expect(medicalCertificatesService.create).toHaveBeenCalledWith(expect.objectContaining({
      member_id: 11,
      fecha_emision: '2026-06-19'
    }));

    alertSpy.mockRestore();
  });

});