const STORAGE_KEY = 'portal_tenant';

/** Hosts de túneles efímeros (dev): el subdominio es random, no un slug de tenant. */
function isTunnelHost(host: string): boolean {
  return host.endsWith('.trycloudflare.com');
}

// Extrae el tenantId en este orden: ?tenant= (dev/QA, se persiste) → subdominio (prod)
// → último ?tenant= persistido (PWA instalada: el start_url pierde el query) → default dev.
export function resolveTenantIdFromUrl(
  loc: { search: string; hostname: string } = window.location,
): string {
  // 1. Query param (útil en localhost/túneles para alternar entre tenants seedados sin
  //    levantar hosts file ni subdominios). Se persiste para que la PWA instalada
  //    (que abre en start_url "/" sin query) resuelva el mismo tenant.
  const fromQuery = new URLSearchParams(loc.search).get('tenant');
  if (fromQuery) {
    try {
      localStorage.setItem(STORAGE_KEY, fromQuery);
    } catch {
      // storage lleno/bloqueado: seguimos sin persistir
    }
    return fromQuery;
  }

  // 2. Formato productivo: <tenant>.<dominio>.<tld> (3 partes mínimo).
  //    En túneles efímeros el subdominio es basura random — se saltea.
  const host  = loc.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 && !isTunnelHost(host)) {
    return parts[0];
  }

  // 3. PWA instalada / navegación sin query: último tenant elegido explícitamente.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return saved;
    }
  } catch {
    // sin storage: caemos al default
  }

  // 4. localhost, 127.0.0.1, IP pura → default de desarrollo.
  //    'lab-demo' matchea el slug seedado por V900__seed_local_dev.sql del backend.
  return 'lab-demo';
}
