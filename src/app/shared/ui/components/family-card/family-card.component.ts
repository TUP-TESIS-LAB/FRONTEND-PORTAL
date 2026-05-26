import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Familiar } from '../../../../core/models/familiar.model';

@Component({
  selector: 'ui-family-card',
  standalone: true,
  imports: [],
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

  /** Emitted when the card is clicked. */
  @Output() select = new EventEmitter<Familiar>();

  /**
   * Kept for backwards-compat with familia.component which binds (verEstudios) and (sacarTurno).
   * Both now fire on card click via onClick(); consumers that relied on the explicit action
   * buttons should migrate to (select) or handle navigation via the parent's onClick logic.
   */
  @Output() verEstudios = new EventEmitter<Familiar>();
  @Output() sacarTurno  = new EventEmitter<Familiar>();

  onClick(): void {
    this.select.emit(this.familiar);
  }
}
