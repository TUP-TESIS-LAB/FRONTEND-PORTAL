import { Component, inject } from '@angular/core';
import { TenantService } from '../../core/tenant/tenant.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="ui-content" style="text-align: center; padding-top: 80px;">
      <h1 style="color: var(--brand-primary)">
        {{ tenant.config()?.fullName }}
      </h1>
      <p style="color: var(--ds-text-muted); font-size: 18px;">
        Dashboard — próximamente
      </p>
    </div>
  `,
})
export class DashboardComponent {
  readonly tenant = inject(TenantService);
}
