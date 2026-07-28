import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

describe('routes', () => {
  it('la entrada pública /ayuda (con canMatch) va antes que la ruta \'\' del shell', () => {
    const indexAyudaPublica = routes.findIndex(r => r.path === 'ayuda' && r.canMatch !== undefined);
    const indexShellRoot = routes.findIndex(r => r.path === '' && r.children !== undefined);

    expect(indexAyudaPublica).toBeGreaterThanOrEqual(0);
    expect(indexShellRoot).toBeGreaterThanOrEqual(0);
    expect(indexAyudaPublica).toBeLessThan(indexShellRoot);
  });

  it('la ruta \'\' del shell tiene una hija \'ayuda\' (experiencia logueada)', () => {
    const shellRoot = routes.find(r => r.path === '' && r.children !== undefined);
    const hijaAyuda = shellRoot?.children?.find(c => c.path === 'ayuda');

    expect(hijaAyuda).toBeDefined();
  });
});
