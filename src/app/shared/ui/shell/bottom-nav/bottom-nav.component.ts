import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../types';

@Component({
  selector: 'ui-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  // Recibe los items navegables (max 3); el componente agrega "Más" como 4to
  @Input({ required: true }) items!: NavItem[];

  // El shell escucha este evento para abrir el drawer con el sidebar completo
  @Output() moreClick = new EventEmitter<void>();
}
