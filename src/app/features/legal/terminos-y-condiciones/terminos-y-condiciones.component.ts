import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTopbarComponent } from '../../auth/ui/public-topbar/public-topbar.component';
import { TenantService } from '../../../core/tenant/tenant.service';
import { AuthService } from '../../../core/auth/auth.service';
import { buildTermsContent } from './terminos-y-condiciones.content';

@Component({
  selector: 'app-terminos-y-condiciones',
  standalone: true,
  imports: [RouterLink, PublicTopbarComponent],
  templateUrl: './terminos-y-condiciones.component.html',
  styleUrl: './terminos-y-condiciones.component.scss',
})
export class TerminosYCondicionesComponent {
  readonly tenant = inject(TenantService);
  private readonly auth = inject(AuthService);

  // A T&C se llega desde el registro (sin sesión) y desde el pie del centro de
  // ayuda (con sesión). Mandar siempre a /login sacaría del portal a quien ya entró.
  readonly backRoute = computed(() => (this.auth.isAuthenticated() ? '/' : '/login'));

  readonly content = computed(() => {
    const config = this.tenant.config();
    return buildTermsContent(
      config?.fullName ?? config?.shortName ?? 'el laboratorio',
      config?.contact?.helpEmail,
      config?.contact?.address,
    );
  });
}
