import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'ui-add-family-card',
  standalone: true,
  templateUrl: './add-family-card.component.html',
  styleUrl: './add-family-card.component.scss',
})
export class AddFamilyCardComponent {
  @Output() addClick = new EventEmitter<void>();
}
