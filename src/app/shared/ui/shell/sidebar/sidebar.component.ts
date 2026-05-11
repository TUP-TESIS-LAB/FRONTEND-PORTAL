import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TenantConfig } from '../../../../core/tenant/tenant-config.model';
import { NavGroup, NavItem, UserSummary } from '../../types';

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private router = inject(Router);

  @Input({ required: true }) navGroups!: NavGroup[];
  @Input({ required: true }) user!: UserSummary;
  @Input({ required: true }) tenant!: TenantConfig;
  // Permite reusar el sidebar en el portal admin con otro nombre
  @Input() portalName = 'Portal Paciente';

  @Output() itemClick = new EventEmitter<NavItem>();

  logout(): void {
    // TODO: mover a AuthService
    localStorage.removeItem('auth-session');
    this.router.navigate(['/login']);
  }
}
