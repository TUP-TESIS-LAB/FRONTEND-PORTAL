import { Pipe, PipeTransform } from '@angular/core';
import { EstadoTurno } from '../../core/models/turno.model';

export type EstadoTurnoDisplayKey = 'programado' | 'asistido' | 'cancelado';

/**
 * Colapsa el estado interno del turno al key visual usado por las
 * clases .ui-tag-<key>. Misma agrupacion que EstadoTurnoLabelPipe:
 * programado (verde), asistido (primary), cancelado (rojo).
 */
@Pipe({ name: 'estadoTurnoKey', standalone: true })
export class EstadoTurnoKeyPipe implements PipeTransform {
  transform(estado: EstadoTurno | null | undefined): EstadoTurnoDisplayKey {
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
