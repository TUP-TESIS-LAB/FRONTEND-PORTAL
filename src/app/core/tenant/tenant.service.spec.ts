import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantService } from './tenant.service';
import { TenantConfig } from './tenant-config.model';

const STATIC_CONFIG: TenantConfig = {
  id: 'x',
  shortName: 'Lab X',
  fullName: 'Laboratorio X',
  logo: { color: null, white: null, mark: null },
  colors: {
    primary:   '#2563EB',
    secondary: '#0EA5A4',
    accent:    '#F97316',
  },
  contact: {},
};

// Deja correr los microtasks/macrotasks pendientes entre requests encadenadas
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('TenantService', () => {
  let service: TenantService;
  let httpMock: HttpTestingController;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Limpia las variables inline de corridas anteriores para que los asserts
    // de "no vacía" no pasen por residuos de otro test
    document.documentElement.removeAttribute('style');

    // jsdom no implementa URL.createObjectURL; applyDynamicManifest() lo usa
    // en TODO loadTenant() ahora (el ícono es siempre generado), así que se
    // stubea acá para toda la suite, no solo en los tests de manifest.
    createObjectURL = vi.fn(() => 'blob:fake-manifest');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TenantService,
      ],
    });
    service = TestBed.inject(TenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Ejecuta loadTenant('x') mockeando la config estática y con el
   *  white-label del backend fallando por red (usa solo el estático). */
  async function loadTenantConEstatico(config: TenantConfig = STATIC_CONFIG): Promise<void> {
    const promise = service.loadTenant('x');

    const staticReq = httpMock.expectOne('/assets/tenants/x/tenant.config.json');
    expect(staticReq.request.method).toBe('GET');
    staticReq.flush(config);

    await tick();

    const wlReq = httpMock.expectOne('/public/tenants/x/white-label');
    wlReq.error(new ProgressEvent('error'));

    await promise;
  }

  describe('applyTheme (vía loadTenant)', () => {
    it('setea las variantes --brand-*-dark en el elemento raíz', async () => {
      await loadTenantConEstatico();

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--brand-primary-dark')).not.toBe('');
      expect(style.getPropertyValue('--brand-secondary-dark')).not.toBe('');
      expect(style.getPropertyValue('--brand-accent-dark')).not.toBe('');
    });

    it('setea también las variantes --brand-*-light y los colores base', async () => {
      await loadTenantConEstatico();

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--brand-primary')).toBe('#2563EB');
      expect(style.getPropertyValue('--brand-secondary')).toBe('#0EA5A4');
      expect(style.getPropertyValue('--brand-accent')).toBe('#F97316');
      expect(style.getPropertyValue('--brand-primary-light')).not.toBe('');
      expect(style.getPropertyValue('--brand-secondary-light')).not.toBe('');
      expect(style.getPropertyValue('--brand-accent-light')).not.toBe('');
    });

    it('la variante dark es una mezcla con negro del color base', async () => {
      await loadTenantConEstatico();

      // #2563EB = rgb(37, 99, 235) → con ratio 0.25: rgb(28, 74, 176)
      expect(document.documentElement.style.getPropertyValue('--brand-primary-dark'))
        .toBe('rgb(28, 74, 176)');
    });
  });

  describe('ícono por tenant: logo propio si existe, si no círculo + silueta', () => {
    function conLinkFavicon(): HTMLLinkElement {
      document.querySelector('link[rel="icon"]')?.remove();
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = '/favicon.ico';
      document.head.appendChild(link);
      return link;
    }

    it('sin logo propio, el favicon es el SVG data-URI con el color del tenant y la silueta neutra', async () => {
      const link = conLinkFavicon();
      await loadTenantConEstatico();

      expect(link.type).toBe('image/svg+xml');
      expect(link.href.startsWith('data:image/svg+xml')).toBe(true);
      const svg = decodeURIComponent(link.href.split(',')[1]);
      expect(svg).toContain('fill="#2563EB"');
      expect(svg).toContain('data:image/png;base64,');
    });

    it('con logo propio (mark) configurado, el favicon usa ese logo y no el default', async () => {
      const link = conLinkFavicon();
      await loadTenantConEstatico({
        ...STATIC_CONFIG,
        logo: { color: null, white: null, mark: '/assets/tenants/x/logo-mark.svg' },
      });

      expect(link.href).toContain('/assets/tenants/x/logo-mark.svg');
      expect(link.type).toBe('image/svg+xml');
    });

    it('tenant.icon() (usado por la UI) sigue la misma regla que el favicon', async () => {
      await loadTenantConEstatico({
        ...STATIC_CONFIG,
        logo: { color: '/assets/tenants/x/logo.png', white: null, mark: null },
      });

      expect(service.icon()).toBe('/assets/tenants/x/logo.png');
    });
  });

  describe('manifest PWA por tenant', () => {
    function conLinkManifest(): HTMLLinkElement {
      document.querySelector('link[rel="manifest"]')?.remove();
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.webmanifest';
      document.head.appendChild(link);
      return link;
    }

    it('genera siempre un manifest dinámico (Blob URL) con el ícono círculo+silueta', async () => {
      const link = conLinkManifest();
      await loadTenantConEstatico();

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('application/manifest+json');
      expect(link.href).toBe('blob:fake-manifest');
    });

    it('revoca el manifest anterior si se resuelve otro tenant en la misma sesión', async () => {
      conLinkManifest();
      await loadTenantConEstatico();
      await loadTenantConEstatico({ ...STATIC_CONFIG, id: 'y' });

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-manifest');
    });
  });

  describe('darken / lighten', () => {
    it('darken mezcla el hex con negro según el ratio', () => {
      // Cast a any para ejercitar el método privado directamente
      const darken = (service as any).darken.bind(service);
      expect(darken('#FFFFFF', 0.25)).toBe('rgb(191, 191, 191)');
      expect(darken('#000000', 0.25)).toBe('rgb(0, 0, 0)');
      expect(darken('#0EA5A4', 0.25)).toBe('rgb(11, 124, 123)');
    });

    it('lighten mezcla el hex con blanco según el ratio', () => {
      const lighten = (service as any).lighten.bind(service);
      expect(lighten('#000000', 0.92)).toBe('rgb(235, 235, 235)');
      expect(lighten('#FFFFFF', 0.92)).toBe('rgb(255, 255, 255)');
    });
  });
});
