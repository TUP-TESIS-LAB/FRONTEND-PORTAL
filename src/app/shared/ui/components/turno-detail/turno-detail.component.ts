import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PrepWarningComponent } from '../prep-warning/prep-warning.component';
import { Turno } from '../../../../core/models/turno.model';

@Component({
  selector: 'ui-turno-detail',
  standalone: true,
  imports: [ButtonModule, TagModule, PrepWarningComponent],
  templateUrl: './turno-detail.component.html',
  styleUrl: './turno-detail.component.scss',
})
export class TurnoDetailComponent {
  @Input({ required: true }) turno!: Turno;

  @Output() reprogramar = new EventEmitter<Turno>();
  @Output() cancelar    = new EventEmitter<Turno>();
  @Output() close       = new EventEmitter<void>();
}
