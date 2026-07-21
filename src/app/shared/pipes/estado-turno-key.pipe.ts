import { Pipe, PipeTransform } from '@angular/core';
import { EstadoTurno } from '../../core/models/turno.model';

export type EstadoTurnoDisplayKey = 'programado' | 'asistido' | 'cancelado' | 'no-asistido';

/**
 * Colapsa el estado interno del turno al key visual usado por las
 * clases .ui-tag-<key>. Misma agrupacion que EstadoTurnoLabelPipe:
 * programado (verde), asistido (primary), cancelado (rojo), no-asistido (gris).
 *
 * `fechaTs` es opcional: si se pasa y el turno sigue pendiente/confirmado
 * con fecha ya pasada, lo mostramos como "no asistido" en vez de
 * "programado" (el backend no transiciona automáticamente a NO_SHOW hoy).
 */
@Pipe({ name: 'estadoTurnoKey', standalone: true })
export class EstadoTurnoKeyPipe implements PipeTransform {
  transform(estado: EstadoTurno | null | undefined, fechaTs?: number): EstadoTurnoDisplayKey {
    if ((estado === 'pendiente' || estado === 'confirmado') && fechaTs != null && fechaTs < Date.now()) {
      return 'no-asistido';
    }
    switch (estado) {
      case 'pendiente':
      case 'confirmado':
        return 'programado';
      case 'completado':
        return 'asistido';
      case 'cancelado':
      default:
        return 'cancelado';
    }
  }
}
