import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

export interface EventDetail {
  icon: string; // clase pi sin prefijo: 'pi-clock', 'pi-map-marker'
  text: string;
}

@Component({
  selector: 'ui-event-card',
  standalone: true,
  imports: [TagModule],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  @Input({ required: true }) day!: string;         // '19'
  @Input({ required: true }) month!: string;       // 'MAY'
  @Input({ required: true }) title!: string;
  @Input({ required: true }) details!: EventDetail[];
  @Input({ required: true }) statusKey!: string;   // 'confirmado', 'pendiente', etc.
  @Input({ required: true }) statusLabel!: string;
  @Input() urgent = false;
}
