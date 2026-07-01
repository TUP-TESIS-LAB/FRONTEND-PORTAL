import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TenantConfig } from '../../../../core/tenant/tenant-config.model';
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

  @Output() itemClick = new EventEmitter<NavItem>();
  // El sidebar es un componente puro del DS: delega el logout al shell (que conoce AuthService).
  @Output() logout = new EventEmitter<void>();
}
