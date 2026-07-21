import { describe, it, expect } from 'vitest';
import { BrandMarkComponent } from './brand-mark.component';

// El runner por defecto no resuelve `templateUrl` (ver nota en
// forgot-password.component.spec.ts), así que se testea la lógica de la clase:
// la decisión logo vs chip y el reset del error al cambiar de URL.
type BrandMarkInternals = {
  showLogo: boolean;
  onImgError(): void;
};

function cmp(logoUrl: string | null): BrandMarkComponent & BrandMarkInternals {
  const c = new BrandMarkComponent() as BrandMarkComponent & BrandMarkInternals;
  c.logoUrl = logoUrl;
  return c;
}

describe('BrandMarkComponent', () => {
  it('con logoUrl muestra el logo', () => {
    expect(cmp('/assets/tenants/demo/logo.svg').showLogo).toBe(true);
  });

  it('sin logoUrl (null o undefined) cae al chip de iniciales', () => {
    expect(cmp(null).showLogo).toBe(false);
    const c = new BrandMarkComponent() as BrandMarkComponent & BrandMarkInternals;
    c.logoUrl = undefined;
    expect(c.showLogo).toBe(false);
  });

  it('si la imagen falla al cargar cae al chip', () => {
    const c = cmp('/assets/tenants/demo/logo-roto.svg');
    c.onImgError();
    expect(c.showLogo).toBe(false);
  });

  it('una nueva logoUrl resetea el error y reintenta el logo', () => {
    const c = cmp('/assets/a.svg');
    c.onImgError();
    expect(c.showLogo).toBe(false);
    c.logoUrl = '/assets/b.svg';
    expect(c.showLogo).toBe(true);
  });
});
