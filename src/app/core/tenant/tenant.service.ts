import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TenantConfig } from './tenant-config.model';
import { resolveTenantIcon, mimeTypeForIcon } from './tenant-icon.util';

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

  // Ícono a mostrar en la UI (topbar): logo propio del tenant si subió uno,
  // si no el default (círculo con su color + silueta del tubo de ensayo).
  // Misma regla que favicon/manifest, ver tenant-icon.util.ts.
  readonly icon = computed(() => {
    const config = this._config();
    return config ? resolveTenantIcon(config.logo, config.colors.primary, 'color') : null;
  });

  // Object URL del manifest dinámico generado para el tenant activo (para
  // poder revocarlo si se resuelve otro tenant en la misma sesión).
  private manifestObjectUrl: string | null = null;

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

    // Variantes oscuras — sin esto los componentes del DS que usan
    // --brand-*-dark (hover, family-card, etc.) quedan clavados en los
    // defaults de tokens.scss para cualquier tenant. El ratio 0.25 aproxima
    // la relación entre los pares default (#2563EB→#1D4ED8, etc.).
    root.style.setProperty('--brand-primary-dark',   this.darken(config.colors.primary, 0.25));
    root.style.setProperty('--brand-secondary-dark', this.darken(config.colors.secondary, 0.25));
    root.style.setProperty('--brand-accent-dark',    this.darken(config.colors.accent, 0.25));

    // URLs de logo (si el tenant no tiene, la var queda sin imagen — el
    // fallback visible lo resuelve ui-brand-mark con las iniciales)
    root.style.setProperty('--brand-logo',       config.logo.color ? `url('${config.logo.color}')` : 'none');
    root.style.setProperty('--brand-logo-white', config.logo.white ? `url('${config.logo.white}')` : 'none');

    // Theme color del PWA (meta tag)
    document.querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', config.colors.primary);

    // Ícono del tenant (favicon + manifest PWA): su logo propio si subió uno
    // (mark > cualquier otra variante), si no el default de la plataforma.
    // Misma regla y misma función que usa el ui-brand-mark en la UI.
    const iconUrl = resolveTenantIcon(config.logo, config.colors.primary, 'mark');

    const faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (faviconLink) {
      faviconLink.href = iconUrl;
      faviconLink.type = mimeTypeForIcon(iconUrl);
    }

    this.applyDynamicManifest(config, iconUrl);

    // Título de la pestaña
    document.title = config.shortName + ' — Portal';
  }

  /**
   * PWA instalable con ícono propio por tenant: sin endpoint de manifest
   * por tenant en el backend, generamos el manifest.webmanifest en runtime
   * (Blob URL) con el ícono resuelto por `resolveTenantIcon`. El navegador
   * no valida que el ícono mida realmente lo declarado en `sizes`, así que
   * "any" es válido acá.
   */
  private applyDynamicManifest(config: TenantConfig, iconUrl: string): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;

    if (this.manifestObjectUrl) {
      URL.revokeObjectURL(this.manifestObjectUrl);
    }

    const manifest = {
      name: config.fullName,
      short_name: config.shortName,
      description: `Portal de pacientes de ${config.fullName}.`,
      lang: 'es',
      dir: 'ltr',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      background_color: '#F7F8FA',
      theme_color: config.colors.primary,
      icons: [
        { src: iconUrl, sizes: 'any', type: mimeTypeForIcon(iconUrl), purpose: 'any' },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    this.manifestObjectUrl = URL.createObjectURL(blob);
    link.href = this.manifestObjectUrl;
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

  // Genera un tono oscuro mezclando el hex con negro al porcentaje indicado
  // (espejo de lighten)
  private darken(hex: string, ratio: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * (1 - ratio));
    const dg = Math.round(g * (1 - ratio));
    const db = Math.round(b * (1 - ratio));
    return `rgb(${dr}, ${dg}, ${db})`;
  }
}
