import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TenantService } from './core/tenant/tenant.service';
import { TenantSwitcherComponent } from './shared/ui/tenant-switcher/tenant-switcher.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TenantSwitcherComponent],
  template: `
    <router-outlet />
    <app-tenant-switcher />
  `,
})
export class App {
  readonly tenant = inject(TenantService);
}
