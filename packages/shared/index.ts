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