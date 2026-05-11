export type EstadoTurno = 'pendiente' | 'confirmado' | 'cancelado' | 'completado';

export interface Turno {
  id: number;
  personaId: number;
  personaNombre: string;
  personaIniciales: string;

  dia: string;
  mes: string;
  fechaCompleta: string;
  hora: string;

  tipo: string;
  estudios: string[];
  sede: {
    id: string;
    nombre: string;
    direccion: string;
    telefono?: string;
    horario?: string;
  };

  estado: EstadoTurno;
  estadoLabel: string;

  preparacion: string[];
  llegarMinAntes: number;
  duracionEstimada?: string;
  ordenCargada: boolean;
  medicoSolicitante?: string;
}
