// Extrae el tenantId en este orden: ?tenant= (dev/QA) → subdominio (prod) → default dev.
export function resolveTenantIdFromUrl(): string {
  // 1. Query param (útil en localhost para alternar entre tenants seedados sin
  //    levantar hosts file ni subdominios).
  const fromQuery = new URLSearchParams(window.location.search).get('tenant');
  if (fromQuery) {
    return fromQuery;
  }

  // 2. Formato productivo: <tenant>.<dominio>.<tld> (3 partes mínimo)
  const host  = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  // 3. localhost, 127.0.0.1, IP pura → default de desarrollo.
  //    'lab-demo' matchea el slug seedado por V900__seed_local_dev.sql del backend.
  return 'lab-demo';
}
