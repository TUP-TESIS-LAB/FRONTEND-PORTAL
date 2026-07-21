import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'ui-coverage-card',
  standalone: true,
  imports: [TagModule],
  templateUrl: './coverage-card.component.html',
  styleUrl: './coverage-card.component.scss',
})
export class CoverageCardComponent {
  @Input({ required: true }) cobertura!: User['cobertura'];

  @Output() subirCredencial = new EventEmitter<void>();

  get inicalesPlan(): string {
    const words = this.cobertura.nombre.split(' ');
    return words
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }
}
