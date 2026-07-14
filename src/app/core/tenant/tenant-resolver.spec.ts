import { beforeEach, describe, expect, it } from 'vitest';
import { resolveTenantIdFromUrl } from './tenant-resolver';

describe('resolveTenantIdFromUrl', () => {
  beforeEach(() => localStorage.clear());

  it('el query param gana y queda persistido', () => {
    const slug = resolveTenantIdFromUrl({ search: '?tenant=lab-full', hostname: 'localhost' });
    expect(slug).toBe('lab-full');
    expect(localStorage.getItem('portal_tenant')).toBe('lab-full');
  });

  it('en host productivo resuelve por subdominio', () => {
    const slug = resolveTenantIdFromUrl({ search: '', hostname: 'bioquimica-norte.midominio.com' });
    expect(slug).toBe('bioquimica-norte');
  });

  it('en tunel efimero ignora el subdominio random y usa el tenant persistido', () => {
    localStorage.setItem('portal_tenant', 'lab-demo');
    const slug = resolveTenantIdFromUrl({
      search: '',
      hostname: 'enjoyed-antenna-suffered-commander.trycloudflare.com',
    });
    expect(slug).toBe('lab-demo');
  });

  it('en tunel sin tenant persistido cae al default de desarrollo', () => {
    const slug = resolveTenantIdFromUrl({ search: '', hostname: 'random-cosa.trycloudflare.com' });
    expect(slug).toBe('lab-demo');
  });

  it('en localhost sin query ni persistido cae al default', () => {
    expect(resolveTenantIdFromUrl({ search: '', hostname: 'localhost' })).toBe('lab-demo');
  });
});
