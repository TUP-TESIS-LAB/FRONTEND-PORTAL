import { Component, inject } from '@angular/core';
import { TenantService } from '../../../../core/tenant/tenant.service';
import { BrandMarkComponent } from '../../../../shared/ui/components/brand-mark/brand-mark.component';

@Component({
  selector: 'app-public-topbar',
  standalone: true,
  imports: [BrandMarkComponent],
  templateUrl: './public-topbar.component.html',
  styleUrl: './public-topbar.component.scss',
})
export class PublicTopbarComponent {
  readonly tenant = inject(TenantService);
}
