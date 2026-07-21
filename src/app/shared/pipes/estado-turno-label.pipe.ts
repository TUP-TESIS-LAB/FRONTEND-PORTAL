import { Pipe, PipeTransform } from '@angular/core';
import { EstadoTurno } from '../../core/models/turno.model';

/**
 * Traduce el estado interno del turno a una de las etiquetas
 * orientadas al paciente: Programado, Asistido, Cancelado o No asistido.
 *
 * El backend usa estados mas granulares (SCHEDULED, IN_PROGRESS,
 * RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW, CONFIRMED) que el
 * mapper colapsa al type EstadoTurno; este pipe colapsa aun mas
 * porque al paciente solo le importa "esta agendado", "ya fui",
 * "se cancelo" o "no fui".
 *
 * `fechaTs` es opcional: si se pasa y el turno sigue pendiente/confirmado
 * con fecha ya pasada, lo mostramos como "No asistido" (el backend no
 * transiciona automáticamente a NO_SHOW hoy — ver AppointmentStatus.NO_SHOW).
 */
@Pipe({ name: 'estadoTurnoLabel', standalone: true })
export class EstadoTurnoLabelPipe implements PipeTransform {
  transform(estado: EstadoTurno | null | undefined, fechaTs?: number): string {
    if ((estado === 'pendiente' || estado === 'confirmado') && fechaTs != null && fechaTs < Date.now()) {
      return 'No asistido';
    }
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
