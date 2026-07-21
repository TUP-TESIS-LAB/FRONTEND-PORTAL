// Análisis del catálogo real (el mismo que usa el laboratorio en atención),
// en su vista segura para el paciente — ver AnalysisBookingResponse en el backend.

export interface AnalysisBooking {
  id: number;
  name: string;
  familyName: string | null;
}

export interface AnalysisBookingDetail extends AnalysisBooking {
  determinations: { id: number; name: string }[];
}
