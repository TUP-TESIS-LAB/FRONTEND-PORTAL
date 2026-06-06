import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TenantConfig } from './tenant-config.model';

/** Shape de GET /public/tenants/{slug}/white-label (backend). */
interface BackendWhiteLabel {
  tenantSlug: string;
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl?: string;
  darkLogoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private http = inject(HttpClient);

  private _config = signal<TenantConfig | null>(null);

  // Solo lectura para el resto de la app
  readonly config   = this._config.asReadonly();
  readonly isLoaded = computed(() => this._config() !== null);

  // Degradé para la pantalla de auth derivado del color primario del tenant.
  // Se calcula como computed para que el template lo use con binding directo
  // y no dependa de color-mix() ni de variables CSS en runtime.
  readonly authPageBg = computed(() => {
    const hex = this._config()?.colors.primary ?? '#2563EB';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const hex2 = this._config()?.colors.secondary ?? '#0EA5A4';
    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);
    return `linear-gradient(135deg, rgba(${r},${g},${b},0.18) 0%, rgba(${r2},${g2},${b2},0.12) 100%)`;
  });

  async loadTenant(tenantId: string): Promise<void> {
    // 1) Carga base estática (assets) — necesaria para campos que el backend
    //    no expone todavía (shortName, tagline, contact, accent color, mark logo).
    const staticUrl = `/assets/tenants/${tenantId}/tenant.config.json`;
    let baseConfig: TenantConfig;
    try {
      baseConfig = await firstValueFrom(this.http.get<TenantConfig>(staticUrl));
    } catch {
      throw new Error(`No se pudo cargar la configuración del tenant "${tenantId}"`);
    }

    // 2) Trae el white-label real del backend (colores + systemName + logos).
    //    Si falla por red o el tenant no tiene white-label seedeado, sigue con
    //    el estático sin error — el portal es funcional con cualquiera de los dos.
    let finalConfig = baseConfig;
    try {
      const wl = await firstValueFrom(
        this.http.get<BackendWhiteLabel>(`/public/tenants/${tenantId}/white-label`),
      );
      finalConfig = this.mergeWhiteLabel(baseConfig, wl);
    } catch {
      // Fallback silencioso al estático.
    }

    this._config.set(finalConfig);
    this.applyTheme(finalConfig);
  }

  /**
   * Mezcla el white-label del backend (colores + systemName + logos) sobre la
   * config estática. El backend gana para visual (colores, nombre); la config
   * estática provee accent (todavía no en backend), contact, tagline, mark.
   */
  private mergeWhiteLabel(base: TenantConfig, wl: BackendWhiteLabel): TenantConfig {
    return {
      ...base,
      fullName: wl.systemName || base.fullName,
      colors: {
        primary:   wl.primaryColor   || base.colors.primary,
        secondary: wl.secondaryColor || base.colors.secondary,
        accent:    base.colors.accent,
      },
      logo: {
        color: wl.lightLogoUrl || base.logo.color,
        white: wl.darkLogoUrl  || base.logo.white,
        mark:  base.logo.mark,
      },
    };
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
