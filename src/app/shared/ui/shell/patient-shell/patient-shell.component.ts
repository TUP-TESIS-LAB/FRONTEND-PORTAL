import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { BottomSheetComponent, BottomSheetItem } from '../../overlays/bottom-sheet/bottom-sheet.component';
import { TenantService } from '../../../../core/tenant/tenant.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { NavGroup, NavItem, UserSummary } from '../../types';

@Component({
  selector: 'ui-patient-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    DrawerModule,
    ButtonModule,
    SidebarComponent,
    BottomNavComponent,
    BottomSheetComponent,
  ],
  templateUrl: './patient-shell.component.html',
  styleUrl: './patient-shell.component.scss',
})
export class PatientShellComponent {
  private readonly tenantSvc = inject(TenantService);
  private readonly router    = inject(Router);
  private readonly auth      = inject(AuthService);

  tenant = this.tenantSvc.config;

  // Drawer lateral: se mantiene para uso futuro (ej: desde la topbar mobile)
  drawerOpen    = signal(false);
  // Bottom sheet: se abre desde el botón "Más" del bottom-nav
  moreSheetOpen = signal(false);

  // Usuario real del JWT (AuthService). Deriva nombre/apellido/iniciales del nombre completo.
  readonly user = computed<UserSummary>(() => {
    const u = this.auth.currentUser();
    const full = (u?.nombre ?? '').trim();
    const parts = full.split(/\s+/).filter(Boolean);
    const nombre = parts[0] ?? '';
    const apellido = parts.slice(1).join(' ');
    const iniciales = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
      || (nombre[0] ?? '?').toUpperCase();
    return { iniciales, nombre, apellido, dni: u?.dni ?? '' };
  });

  navGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        { id: 'inicio',   icon: 'pi-home',     label: 'Inicio',   route: '/',          exactMatch: true },
        { id: 'estudios', icon: 'pi-file',      label: 'Estudios', route: '/estudios' },
        { id: 'turnos',   icon: 'pi-calendar',  label: 'Turnos',   route: '/turnos'   },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { id: 'perfil',  icon: 'pi-user',  label: 'Mi perfil',  route: '/perfil'  },
        { id: 'familia', icon: 'pi-users', label: 'Mi familia', route: '/familia' },
      ],
    },
  ];

  // Opciones del bottom sheet: secciones secundarias que no entran en el bottom-nav
  moreSheetItems: BottomSheetItem[] = [
    { id: 'perfil',  icon: 'pi-user',     label: 'Mi perfil',      route: ['/perfil']  },
    { id: 'familia', icon: 'pi-users',    label: 'Mi familia',     route: ['/familia'] },
    { id: 'logout',  icon: 'pi-sign-out', label: 'Cerrar sesión',
      action: () => this.logout(), destructive: true },
  ];

  // Solo los items principales van al bottom-nav
  get mainNavItems(): NavItem[] {
    return this.navGroups[0].items;
  }

  onMoreItemClick(_item: BottomSheetItem): void {
    // El componente ui-bottom-sheet ya navegó/ejecutó la acción y cerró el sheet.
    // Este handler queda disponible para side-effects adicionales si se necesitan.
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
