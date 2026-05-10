import { Component, inject, signal, HostListener } from '@angular/core';
import { TenantService } from '../../../core/tenant/tenant.service';

interface TenantOption {
  id: string;
  label: string;
  short: string;
  color: string;
}

// Lista de tenants disponibles en desarrollo.
// TODO: en producción esto no se muestra — solo aparece en DEV.
const DEV_TENANTS: TenantOption[] = [
  { id: 'castillo-chidiak', label: 'Castillo Chidiak', short: 'LCC', color: '#1F6E70' },
  { id: 'bioquimica-norte', label: 'Bioquímica del Norte', short: 'BN',  color: '#1D4ED8' },
];

@Component({
  selector: 'app-tenant-switcher',
  standalone: true,
  templateUrl: './tenant-switcher.component.html',
  styleUrl: './tenant-switcher.component.scss',
})
export class TenantSwitcherComponent {
  private tenantSvc = inject(TenantService);

  readonly tenants = DEV_TENANTS;
  readonly open     = signal(false);

  get current(): TenantOption | undefined {
    return this.tenants.find(t => t.id === this.tenantSvc.config()?.id);
  }

  toggle(): void {
    this.open.update(v => !v);
  }

  async select(id: string): Promise<void> {
    if (id === this.tenantSvc.config()?.id) {
      this.open.set(false);
      return;
    }
    await this.tenantSvc.loadTenant(id);
    this.open.set(false);
  }

  // Cierra el panel si el click fue fuera del componente
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !(e.target as HTMLElement).closest('.tenant-switcher')) {
      this.open.set(false);
    }
  }
}
