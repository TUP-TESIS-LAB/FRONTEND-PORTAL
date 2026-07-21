import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { TimeSlotsComponent } from '../time-slots/time-slots.component';
import { SlotDisponible } from '../../../../core/models/slot-disponible.model';

/**
 * Paso reutilizable "fecha + horarios": calendario inline + grilla de slots.
 * Lo usan el wizard de sacar-turno y el flujo de reprogramar (drawer/bottom-sheet).
 * El estado lo controla el padre (inputs); el componente solo emite los cambios.
 */
@Component({
  selector: 'ui-slot-picker',
  standalone: true,
  imports: [FormsModule, DatePickerModule, TimeSlotsComponent],
  templateUrl: './slot-picker.component.html',
  styleUrl: './slot-picker.component.scss',
})
export class SlotPickerComponent {
  @Input() fecha: Date | null = null;
  @Input() selectedHora: string | null = null;
  @Input() slots: SlotDisponible[] = [];
  @Input() loading = false;
  @Input({ required: true }) minDate!: Date;
  /** 'grid' = calendario y slots lado a lado (desktop full-width); 'stacked' = apilados (drawer angosto). */
  @Input() layout: 'grid' | 'stacked' = 'grid';

  @Output() fechaChange = new EventEmitter<Date>();
  @Output() horaChange = new EventEmitter<string>();
}
