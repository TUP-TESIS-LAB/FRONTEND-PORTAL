// Extrae el tenantId del subdominio: <tenant>.miapp.com → 'tenant'
// En localhost o sin subdominio real → devuelve el tenant default de desarrollo
export function resolveTenantIdFromUrl(): string {
  const host  = window.location.hostname;
  const parts = host.split('.');

  // Formato productivo: <tenant>.<dominio>.<tld> (3 partes mínimo)
  if (parts.length >= 3) {
    return parts[0];
  }

  // localhost, 127.0.0.1, IP pura → default de desarrollo
  return 'castillo-chidiak';
}
