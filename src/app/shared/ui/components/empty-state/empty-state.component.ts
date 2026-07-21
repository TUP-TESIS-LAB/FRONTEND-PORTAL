import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  // Clase pi sin prefijo: 'pi-calendar', 'pi-file', 'pi-user'
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) heading!: string;
  @Input() message?: string;
}
