import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { SlotDisponible } from '../../../../core/models/slot-disponible.model';

@Component({
  selector: 'ui-time-slots',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './time-slots.component.html',
  styleUrl: './time-slots.component.scss',
})
export class TimeSlotsComponent {
  @Input({ required: true }) slots!: SlotDisponible[];
  @Input({ required: true }) selectedHora!: string | null;
  @Input() loading = false;

  @Output() selectionChange = new EventEmitter<string>();

  selectSlot(slot: SlotDisponible): void {
    if (!slot.disponible) return;
    this.selectionChange.emit(slot.hora);
  }
}
