import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTopbarComponent } from '../../auth/ui/public-topbar/public-topbar.component';
import { TenantService } from '../../../core/tenant/tenant.service';
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

  readonly content = computed(() => {
    const config = this.tenant.config();
    return buildTermsContent(
      config?.fullName ?? config?.shortName ?? 'el laboratorio',
      config?.contact?.helpEmail,
      config?.contact?.address,
    );
  });
}
