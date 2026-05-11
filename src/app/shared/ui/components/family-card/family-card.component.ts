import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Familiar } from '../../../../core/models/familiar.model';

const ACCENT_MAP: Record<'primary' | 'secondary' | 'accent', string> = {
  primary:   'var(--brand-primary)',
  secondary: 'var(--brand-secondary)',
  accent:    'var(--brand-accent)',
};

@Component({
  selector: 'ui-family-card',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
})
export class FamilyCardComponent {
  @Input({ required: true }) familiar!: Familiar;

  @Output() verEstudios = new EventEmitter<Familiar>();
  @Output() sacarTurno  = new EventEmitter<Familiar>();

  get accentColor(): string {
    return ACCENT_MAP[this.familiar.accentColor];
  }
}
