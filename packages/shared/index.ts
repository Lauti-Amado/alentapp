// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO Date String (YYYY-MM-DD)
  category?: MemberCategory;
  status?: MemberStatus;
}

// ==========================================
// Payment
// ==========================================
export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Cancelado';

export interface PaymentDTO {
  id: string; // UUID
  member_id: string;
  monto: number;
  mes: number;
  anio: number;
  estado: PaymentStatus;
  fecha_vencimiento: string; // ISO Date String (YYYY-MM-DD)
  fecha_pago: string | null; // ISO Date String (YYYY-MM-DD)
  creado_el: string; // ISO Date String
  deleted_at: string | null; // ISO Date String
}

export interface CreatePaymentRequest {
  member_id: string;
  monto: number;
  mes: number;
  anio: number;
  fecha_vencimiento: string; // ISO Date String (YYYY-MM-DD)
}


// ==========================================
// Locker
// ==========================================
export type LockerStatus = 'Disponible' | 'Ocupado' | 'Mantenimiento';

export interface LockerDTO {
    id: string; // UUID
    numero: number;
    estado: LockerStatus;
    ubicacion: string;
    member_id: string | null;
}

export interface CreateLockerRequest {
    numero: number;
    ubicacion: string;
}

export interface UpdateLockerRequest {
    numero?: number;
    estado?: LockerStatus;
    ubicacion?: string;
    member_id?: string | null;
}
// ==========================================
// Discipline
// ==========================================

export interface DisciplineDTO {
  id: string;
  motivo: string;
  fechaInicio: string; // ISO Date String
  fechaFin: string;    // ISO Date String
  esSuspensionTotal: boolean;
  memberId: string;
  motivoLevantamiento: string | null;
}

export interface CreateDisciplineRequest {
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  esSuspensionTotal: boolean;
  memberId: string;
  motivoLevantamiento: string | null;
}

export interface UpdateDisciplineRequest {
  motivo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  esSuspensionTotal?: boolean;
  motivoLevantamiento?: string | null;
}



export interface SportDTO {
    id:                   string    
    Nombre :              string
    Cupo_maximo:          number
    Precio_adicional:     number
    Descripcion:          string
    Require_certificado_medico: boolean;
}

export interface CreateSportRequest { 
    Nombre:              string
    Cupo_maximo:          number
    Precio_adicional:     number
    Descripcion:          string
    Require_certificado_medico: boolean;
}


// ==========================================
// MedicalCertificate
// ==========================================

export interface MedicalCertificateDTO {
  id: string;
  member_id: string;
  fecha_emision: string; // ISO Date String (YYYY-MM-DD)
  fecha_vencimiento: string; // ISO Date String (YYYY-MM-DD)
  esta_validado: boolean;
  licencia_doctor: string;
}

export interface CreateMedicalCertificateRequest {
  member_id: string;
  fecha_emision: string; // ISO Date String (YYYY-MM-DD)
  fecha_vencimiento: string; // ISO Date String (YYYY-MM-DD)
  licencia_doctor: string;
}

export interface UpdateMedicalCertificateRequest {
  member_id?: string;
  fecha_emision?: string; // ISO Date String (YYYY-MM-DD)
  fecha_vencimiento?: string; // ISO Date String (YYYY-MM-DD)
  licencia_doctor?: string;
}
