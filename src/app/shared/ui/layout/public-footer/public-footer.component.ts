import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pie de las pantallas públicas (login, registro). Da acceso al centro de ayuda y
 * a los términos y condiciones, que de otro modo solo se alcanzan desde el
 * checkbox del formulario de registro.
 */
@Component({
  selector: 'ui-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooterComponent {
  // En /register hay un formulario a medio llenar detrás: navegar en la misma
  // pestaña lo destruye sin forma de volver. En /login no hay nada que perder.
  @Input() newTab = false;
}
