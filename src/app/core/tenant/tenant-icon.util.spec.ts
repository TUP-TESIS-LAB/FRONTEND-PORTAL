import { describe, it, expect } from 'vitest';
import { resolveTenantIcon, buildDefaultTenantIcon, mimeTypeForIcon } from './tenant-icon.util';

const NO_LOGO = { color: null, white: null, mark: null };

describe('resolveTenantIcon', () => {
  it('usa la variante preferida si el tenant la tiene', () => {
    const logo = { color: '/assets/tenants/x/logo.svg', white: null, mark: null };
    expect(resolveTenantIcon(logo, '#2563EB', 'color')).toBe('/assets/tenants/x/logo.svg');
  });

  it('sin la variante preferida, usa cualquier otra que el tenant tenga (logo propio igual)', () => {
    const logo = { color: '/assets/tenants/x/logo.svg', white: null, mark: null };
    expect(resolveTenantIcon(logo, '#2563EB', 'white')).toBe('/assets/tenants/x/logo.svg');
  });

  it('sin ningún logo propio, cae al default (círculo + silueta) con el color dado', () => {
    const result = resolveTenantIcon(NO_LOGO, '#F97316', 'mark');
    expect(result).toBe(buildDefaultTenantIcon('#F97316'));
    expect(decodeURIComponent(result.split(',')[1])).toContain('fill="#F97316"');
  });
});

describe('buildDefaultTenantIcon', () => {
  it('genera un SVG data-URI autocontenido (sin referencias externas)', () => {
    const uri = buildDefaultTenantIcon('#123456');
    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    const svg = decodeURIComponent(uri.split(',')[1]);
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('data:image/png;base64,');
    expect(svg).not.toContain('/icons/mark.png');
  });
});

describe('mimeTypeForIcon', () => {
  it('detecta el SVG data-URI generado por buildDefaultTenantIcon', () => {
    expect(mimeTypeForIcon(buildDefaultTenantIcon('#2563EB'))).toBe('image/svg+xml');
  });

  it('detecta un PNG en data-URI', () => {
    expect(mimeTypeForIcon('data:image/png;base64,AAAA')).toBe('image/png');
  });

  it('detecta por extensión .svg', () => {
    expect(mimeTypeForIcon('/assets/tenants/x/logo.svg')).toBe('image/svg+xml');
  });

  it('cualquier otra extensión se asume png', () => {
    expect(mimeTypeForIcon('/assets/tenants/x/logo.png')).toBe('image/png');
  });
});
