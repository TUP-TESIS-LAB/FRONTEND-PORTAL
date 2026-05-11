import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-section',
  standalone: true,
  imports: [],
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
})
export class SectionComponent {
  // Si se omite, no se renderiza el header de la sección
  @Input() heading?: string;
}
