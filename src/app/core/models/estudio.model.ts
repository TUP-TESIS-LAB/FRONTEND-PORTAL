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
 * Llega con KAN-168; hasta entonces queda `undefined`.
 */
export type EstadoFirma = 'pendiente' | 'firmado-parcial' | 'firmado-total';

/**
 * Respuesta cruda del backend: `GET /api/v1/me/results?patientId=` (rol EXTERNO).
 * Resultado analítico crudo, datos mínimos — sin nombre, estado, firma ni PDF.
 */
export interface AnalyticalResultResponse {
  id: number;
  tenantId: number;
  protocolId: number;
  analysisOrderId: number;
  sectionId: number;
  patientId: number;
  collectionDate: string; // ISO LocalDateTime
  active: boolean;
  version: number;
  /** id del informe FINAL firmado; null mientras no exista (KAN-168). */
  reportId: number | null;
  /** true cuando hay informe FINAL descargable (KAN-168). */
  reportAvailable: boolean;
  analysisName: string | null;
  familyName: string | null;
}

/**
 * Estudio del paciente. Mantiene la forma "rica" del mockup para que la UI no
 * cambie; los campos que el backend todavía no expone al paciente (`categoria`,
 * `sede`/`sucursal`, `esNuevo`, `pdf`/`reporteDisponible`, firmante…) son
 * opcionales y la UI los degrada. Los que llegan con KAN-168 se documentan.
 */
export interface Estudio {
  id: number;
  patientId: number;
  protocolId: number;
  analysisOrderId?: number;
  sectionId?: number;

  // Persona (se completa con el paciente activo/seleccionado en el componente)
  personaId: number;
  personaNombre: string;
  personaIniciales: string;

  nombre: string;
  fecha: string;           // 'DD/MM/YYYY'
  fechaTs: number;         // timestamp para ordenar
  estado: EstadoEstudio;
  estadoLabel: string;

  // ── Opcionales / diferidos (hoy sin dato real) ──────────────
  categoria?: CategoriaEstudio;
  esNuevo?: boolean;
  sede?: string;
  sucursal?: string;
  estadoFirma?: EstadoFirma;
  reporteDisponible?: boolean;
  /** id del informe FINAL, para armar la descarga. */
  reportId?: number | null;
  reporteUrl?: string;
  pdf?: {
    url: string;
    paginas: number;
    tamano: string;
  };
  protocolo?: string;
  medicoSolicitante?: string;
  medicoFirmante?: string;
  matricula?: string;
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
