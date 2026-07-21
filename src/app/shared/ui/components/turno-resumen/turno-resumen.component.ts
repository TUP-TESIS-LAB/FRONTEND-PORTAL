import { Component, Input } from '@angular/core';
import { TipoAnalisis } from '../../../../core/models/tipo-analisis.model';
import { Sede } from '../../../../core/models/sede.model';

@Component({
  selector: 'ui-turno-resumen',
  standalone: true,
  imports: [],
  templateUrl: './turno-resumen.component.html',
  styleUrl: './turno-resumen.component.scss',
})
export class TurnoResumenComponent {
  @Input({ required: true }) tipos!: TipoAnalisis[];
  @Input({ required: true }) sede!: Sede;
  @Input({ required: true }) fecha!: Date;
  @Input({ required: true }) hora!: string;
  @Input() requiereAyuno = false;
  /** Persona elegida en el paso 1, ya formateada (ej. "Carlos García · Yo"). */
  @Input() paraQuien: string | null = null;

  /** True cuando la sede tiene direccion utilizable (no es placeholder). */
  hasDireccion(direccion: string | undefined | null): boolean {
    const v = direccion?.trim() ?? '';
    return v !== '' && v !== '—';
  }

  formatFecha(fecha: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
  }
}
