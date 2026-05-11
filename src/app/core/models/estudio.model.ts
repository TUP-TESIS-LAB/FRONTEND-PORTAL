export type EstadoEstudio = 'disponible' | 'en-proceso' | 'pendiente';

export type AvatarColor = 'primary' | 'secondary' | 'accent' | 'warning' | 'neutral';

export type CategoriaEstudio =
  | 'hematologia'
  | 'bioquimica'
  | 'hormonas'
  | 'orina'
  | 'coagulacion';

export interface Estudio {
  id: number;
  personaId: number;
  personaNombre: string;
  personaIniciales: string;
  nombre: string;
  categoria: CategoriaEstudio;
  fecha: string;           // 'DD/MM/YYYY'
  fechaToma?: string;
  fechaCarga?: string;
  estado: EstadoEstudio;
  estadoLabel: string;
  esNuevo?: boolean;
  pdf?: {
    url: string;
    paginas: number;
    tamano: string;        // '184 KB'
  };
  protocolo?: string;
  sede?: string;
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
