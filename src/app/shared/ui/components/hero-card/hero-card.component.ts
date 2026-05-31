import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface HeroCardDetail {
  icon: string;
  text: string;
}

@Component({
  selector: 'ui-hero-card',
  standalone: true,
  imports: [],
  templateUrl: './hero-card.component.html',
  styleUrl: './hero-card.component.scss',
})
export class HeroCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) title!: string;
  @Input() details: HeroCardDetail[] = [];
  @Input() chips: string[] = [];
  @Input() decorativeIcon?: string;

  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
}
