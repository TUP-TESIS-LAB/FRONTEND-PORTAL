import { Pipe, PipeTransform } from '@angular/core';
import { EstadoTurno } from '../../core/models/turno.model';

/**
 * Traduce el estado interno del turno a una de las 3 etiquetas
 * orientadas al paciente: Programado, Asistido o Cancelado.
 *
 * El backend usa estados mas granulares (SCHEDULED, IN_PROGRESS,
 * RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW, CONFIRMED) que el
 * mapper colapsa al type EstadoTurno; este pipe colapsa aun mas
 * porque al paciente solo le importa "esta agendado", "ya fui" o
 * "se cancelo".
 */
@Pipe({ name: 'estadoTurnoLabel', standalone: true })
export class EstadoTurnoLabelPipe implements PipeTransform {
  transform(estado: EstadoTurno | null | undefined): string {
    switch (estado) {
      case 'pendiente':
      case 'confirmado':
        return 'Programado';
      case 'completado':
        return 'Asistido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return '';
    }
  }
}
