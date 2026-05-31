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

  /** Emitted when the card is clicked. Consumer decides the action (e.g. edit familiar). */
  @Output() select = new EventEmitter<Familiar>();

  onClick(): void {
    this.select.emit(this.familiar);
  }
}
