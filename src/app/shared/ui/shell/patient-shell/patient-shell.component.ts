import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { TenantService } from '../../../../core/tenant/tenant.service';
import { NavGroup, NavItem, UserSummary } from '../../types';

@Component({
  selector: 'ui-patient-shell',
  standalone: true,
  imports: [RouterOutlet, DrawerModule, ButtonModule, SidebarComponent, BottomNavComponent],
  templateUrl: './patient-shell.component.html',
  styleUrl: './patient-shell.component.scss',
})
export class PatientShellComponent {
  private tenantSvc = inject(TenantService);
  tenant = this.tenantSvc.config;

  drawerOpen = signal(false);

  // Usuario mockeado hasta que exista AuthService
  mockUser: UserSummary = {
    iniciales: 'MF',
    nombre: 'María',
    apellido: 'Fernández',
    dni: '32.456.789',
  };

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

  // Solo los items principales van al bottom nav (Cuenta va en el drawer)
  get mainNavItems(): NavItem[] {
    return this.navGroups[0].items;
  }
}
