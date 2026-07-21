import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TenantConfig } from '../../../../core/tenant/tenant-config.model';
import { resolveTenantIcon } from '../../../../core/tenant/tenant-icon.util';
import { NavGroup, NavItem, UserSummary } from '../../types';
import { BrandMarkComponent } from '../../components/brand-mark/brand-mark.component';

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandMarkComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input({ required: true }) navGroups!: NavGroup[];
  @Input({ required: true }) user!: UserSummary;
  @Input({ required: true }) tenant!: TenantConfig;
  // Permite reusar el sidebar en el portal admin con otro nombre
  @Input() portalName = 'Portal Paciente';

  // Logo propio del tenant (variante white, fondo oscuro del sidebar) si
  // subió uno; si no, el default (círculo con su color + tubo de ensayo).
  // Misma regla que favicon/manifest, ver tenant-icon.util.ts.
  protected get logoUrl(): string {
    return resolveTenantIcon(this.tenant.logo, this.tenant.colors.primary, 'white');
  }

  @Output() itemClick = new EventEmitter<NavItem>();
  // El sidebar es un componente puro del DS: delega el logout al shell (que conoce AuthService).
  @Output() logout = new EventEmitter<void>();
}
