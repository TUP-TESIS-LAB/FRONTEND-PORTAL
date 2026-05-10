import { Component, inject } from '@angular/core';
import { TenantService } from '../../../../core/tenant/tenant.service';

@Component({
  selector: 'app-public-topbar',
  standalone: true,
  templateUrl: './public-topbar.component.html',
  styleUrl: './public-topbar.component.scss',
})
export class PublicTopbarComponent {
  readonly tenant = inject(TenantService);
}
