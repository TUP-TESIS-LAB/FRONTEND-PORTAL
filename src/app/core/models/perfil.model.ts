export interface PerfilPaciente {
  patientId: number; firstName: string; lastName: string; dni: string;
  email: string; phone: string; address: string; coverageName: string;
}
export interface UpdatePerfilPayload { email: string; phone: string; address: string; }
