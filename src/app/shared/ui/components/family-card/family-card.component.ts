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

  /** Emitido cuando el usuario hace click en la zona de la tarjeta (seleccionar). */
  @Output() select = new EventEmitter<Familiar>();

  /** Emitido cuando el usuario hace click en "Quitar". El familiar a quitar. */
  @Output() remove = new EventEmitter<Familiar>();

  onCardClick(): void {
    this.select.emit(this.familiar);
  }

  onRemoveClick(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.familiar);
  }
}
