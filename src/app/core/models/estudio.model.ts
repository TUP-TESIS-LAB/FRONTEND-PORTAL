export type EstadoEstudio = 'disponible' | 'en-proceso' | 'pendiente';

export type AvatarColor = 'primary' | 'secondary' | 'accent' | 'warning' | 'neutral';

export type CategoriaEstudio =
  | 'hematologia'
  | 'bioquimica'
  | 'hormonas'
  | 'orina'
  | 'coagulacion';

/**
 * Estado de firma del estudio (alineado con la postanalítica del backend).
 * Llega con KAN-168; hasta entonces queda `undefined` y la UI degrada.
 */
export type EstadoFirma = 'pendiente' | 'firmado-parcial' | 'firmado-total';

/**
 * Respuesta cruda del backend: `GET /api/v1/me/results?patientId=`
 * (rol EXTERNO). Es el resultado analítico crudo, con datos mínimos —
 * sin nombre, estado, firma ni PDF (ver spec estudios-reales §3.1).
 */
export interface AnalyticalResultResponse {
  id: number;
  tenantId: number;
  protocolId: number;
  analysisOrderId: number;
  sectionId: number;
  patientId: number;
  collectionDate: string; // ISO LocalDateTime, ej. '2026-04-14T10:30:00'
  active: boolean;
  version: number;
}

/**
 * Estudio del paciente — modelo mínimo del portal. Los campos obligatorios
 * son los que provee hoy `GET /me/results`; los opcionales (`sucursal`,
 * `nombre`, `estadoFirma`, `reporteDisponible`) llegan con el endpoint de
 * backend KAN-168 y hasta entonces se muestran degradados.
 */
export interface Estudio {
  id: number;
  patientId: number;
  protocolId: number;
  analysisOrderId?: number;
  sectionId?: number;
  /** Fecha de toma (`collectionDate`) formateada 'DD/MM/YYYY' para la UI. */
  fecha: string;
  /** Timestamp de la fecha de toma, para ordenar. */
  fechaTs: number;
  // ── Diferidos a KAN-168 (hoy `undefined`) ──────────────────
  sucursal?: string;
  nombre?: string;
  estadoFirma?: EstadoFirma;
  reporteDisponible?: boolean;
  reporteUrl?: string;
}

export interface GrupoEstudios {
  grupoFecha: string;      // 'Abril 2026'
  items: Estudio[];
}

export interface PersonaChip {
  id: number | null;       // null = "Todos"
  nombre: string;
  iniciales: string;
  avatarColor: AvatarColor;
}

export interface EstudiosFiltros {
  rangoFechas: { desde: Date; hasta: Date } | null;
  tipos: CategoriaEstudio[];
  estados: EstadoEstudio[];
}
