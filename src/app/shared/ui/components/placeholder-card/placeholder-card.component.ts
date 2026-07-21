import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-placeholder-card',
  standalone: true,
  imports: [],
  templateUrl: './placeholder-card.component.html',
  styleUrl: './placeholder-card.component.scss',
})
export class PlaceholderCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  @Input() description?: string;
}
