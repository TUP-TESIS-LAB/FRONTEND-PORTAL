import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Familiar } from '../../../../core/models/familiar.model';

@Component({
  selector: 'ui-family-card',
  standalone: true,
  imports: [ButtonModule, TagModule],
  templateUrl: './family-card.component.html',
  styleUrl: './family-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-selected]': 'selected',
  },
})
export class FamilyCardComponent {
  @Input({ required: true }) familiar!: Familiar;
  @Input() selected = false;

  /**
   * Si la tarjeta es clickeable (cursor, hover, role button, tabindex).
   * Default true para no romper contextos de selección (ej. step-para-quien).
   * En pantallas donde la card es solo informativa (ej. Familia), pasar false.
   */
  @Input() interactive = true;

  /** Emitido cuando el usuario hace click en la zona de la tarjeta (seleccionar). Solo si `interactive`. */
  @Output() select = new EventEmitter<Familiar>();

  /** Emitido cuando el usuario hace click en "Quitar". El familiar a quitar. */
  @Output() remove = new EventEmitter<Familiar>();

  onCardClick(): void {
    if (!this.interactive) return;
    this.select.emit(this.familiar);
  }

  onRemoveClick(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.familiar);
  }
}
