import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TenantService } from './core/tenant/tenant.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
  `,
})
export class App {
  readonly tenant = inject(TenantService);
}
