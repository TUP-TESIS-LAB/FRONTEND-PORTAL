import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TenantConfig } from './tenant-config.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private http = inject(HttpClient);

  private _config = signal<TenantConfig | null>(null);

  // Solo lectura para el resto de la app
  readonly config   = this._config.asReadonly();
  readonly isLoaded = computed(() => this._config() !== null);

  async loadTenant(tenantId: string): Promise<void> {
    // En desarrollo: lee desde public/assets.
    // TODO: en producción reemplazar por GET /api/tenants/${tenantId}/config
    const url = `/assets/tenants/${tenantId}/tenant.config.json`;

    try {
      const config = await firstValueFrom(
        this.http.get<TenantConfig>(url)
      );
      this._config.set(config);
      this.applyTheme(config);
    } catch {
      throw new Error(`No se pudo cargar la configuración del tenant "${tenantId}"`);
    }
  }

  private applyTheme(config: TenantConfig): void {
    const root = document.documentElement;

    // Marca el elemento raíz con el tenant activo (permite overrides SCSS en build-time)
    root.setAttribute('data-tenant', config.id);

    // Aplica los 3 colores de marca; el DS deriva dark/light si el JSON no los trae
    root.style.setProperty('--brand-primary',   config.colors.primary);
    root.style.setProperty('--brand-secondary', config.colors.secondary);
    root.style.setProperty('--brand-accent',    config.colors.accent);

    // Variantes derivadas automáticamente (aproximación sin librería de color)
    root.style.setProperty('--brand-primary-light',   this.lighten(config.colors.primary, 0.92));
    root.style.setProperty('--brand-secondary-light', this.lighten(config.colors.secondary, 0.92));
    root.style.setProperty('--brand-accent-light',    this.lighten(config.colors.accent, 0.92));

    // URLs de logo
    root.style.setProperty('--brand-logo',       `url('${config.logo.color}')`);
    root.style.setProperty('--brand-logo-white', `url('${config.logo.white}')`);

    // Theme color del PWA (meta tag)
    document.querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', config.colors.primary);

    // Título de la pestaña
    document.title = config.shortName + ' — Portal';
  }

  // Genera un tono claro mezclando el hex con blanco al porcentaje indicado
  private lighten(hex: string, ratio: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.round(r + (255 - r) * ratio);
    const lg = Math.round(g + (255 - g) * ratio);
    const lb = Math.round(b + (255 - b) * ratio);
    return `rgb(${lr}, ${lg}, ${lb})`;
  }
}
