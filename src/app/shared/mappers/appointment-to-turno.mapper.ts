import { Familiar } from '../../core/models/familiar.model';
import { Sede } from '../../core/models/sede.model';
import { TipoAnalisis } from '../../core/models/tipo-analisis.model';
import { Turno, EstadoTurno } from '../../core/models/turno.model';
import { parseLocalDateTime } from '../utils/local-datetime';

export interface AppointmentResponse {
  id: number;
  patientId: number;
  branchId: number;
  scheduledAt: string;   // "2026-05-30T08:30:00" — LocalDateTime serialized without timezone
  confirmationNumber: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
  comments: string | null;
  prescriptionFileUrl: string | null;
  determinations: Array<{ determinationId: number; orderNumber: number }>;
}

export interface MapperContext {
  tiposAnalisis: Map<number, TipoAnalisis>;  // key = determinationId
  family: Map<number, Familiar>;             // key = patientId (= Familiar.id)
  sedes: Map<string, Sede>;                  // key = Sede.id (string-coerced branchId)
}

// Solo mapeamos el bucket interno; el label visible al paciente lo
// resuelve EstadoTurnoLabelPipe (Programado / Asistido / Cancelado).
const STATUS_MAP: Record<AppointmentResponse['status'], EstadoTurno> = {
  SCHEDULED:   'pendiente',
  CONFIRMED:   'confirmado',
  IN_PROGRESS: 'pendiente',
  COMPLETED:   'completado',
  CANCELLED:   'cancelado',
  NO_SHOW:     'cancelado',
  RESCHEDULED: 'pendiente',
};

const MESES_ABREV  = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const MESES_FULL   = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS_SEMANA  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export function appointmentToTurno(ap: AppointmentResponse, ctx: MapperContext): Turno {
  // LocalDateTime from Spring (no timezone) — parse as local time
  const date = parseLocalDateTime(ap.scheduledAt) ?? new Date(NaN);
  const persona = ctx.family.get(ap.patientId);
  const sede    = ctx.sedes.get(String(ap.branchId));
  const estado  = STATUS_MAP[ap.status];

  const tipos: TipoAnalisis[] = [];
  for (const d of ap.determinations) {
    const t = ctx.tiposAnalisis.get(d.determinationId);
    if (t && !tipos.some(x => x.id === t.id)) tipos.push(t);
  }
  const estudios    = tipos.map(t => t.nombre);
  const preparacion = Array.from(new Set(tipos.flatMap(t => t.preparacion)));

  return {
    id:              ap.id,
    personaId:       persona?.id ?? 0,
    personaNombre:   persona?.nombre ?? 'Desconocido',
    personaIniciales:persona?.iniciales ?? '?',
    dia:             String(date.getDate()).padStart(2, '0'),
    mes:             MESES_ABREV[date.getMonth()],
    fechaCompleta:   `${DIAS_SEMANA[date.getDay()]} ${date.getDate()} de ${MESES_FULL[date.getMonth()]} de ${date.getFullYear()}`,
    hora:            `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    fechaTs:         date.getTime(),
    tipo:            estudios.join(' + ') || 'Análisis clínicos',
    estudios,
    sede:            sede ?? { id: '0', nombre: 'Sede sin asignar', direccion: '' } as Sede,
    estado,
    preparacion,
    llegarMinAntes:  10,
    ordenCargada:    !!ap.prescriptionFileUrl,
    medicoSolicitante: undefined,
    duracionEstimada:  undefined,
  };
}
