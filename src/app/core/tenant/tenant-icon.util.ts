import { TenantConfig } from './tenant-config.model';
import { MARK_ICON_BASE64 } from './mark-icon-base64';

/**
 * Único punto de la regla de ícono del tenant: si subió cualquier logo
 * propio (mark/color/white) se usa ese, sin importar dónde (favicon, PWA,
 * topbar, sidebar). Si no subió ninguno, el default es el mismo en todos
 * lados: círculo con su color primario + silueta neutra del tubo de ensayo.
 */
export function resolveTenantIcon(
  logo: TenantConfig['logo'],
  primaryColor: string,
  preferred: 'mark' | 'color' | 'white' = 'color',
): string {
  const own = logo[preferred] || logo.mark || logo.color || logo.white;
  return own || buildDefaultTenantIcon(primaryColor);
}

export function buildDefaultTenantIcon(color: string): string {
  // La imagen va embebida en base64 (no como referencia a /icons/mark.png):
  // como SVG data-URI usado de favicon, varios navegadores no resuelven
  // sub-recursos externos, y el logo queda invisible detrás del círculo.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">` +
    `<circle cx="256" cy="256" r="256" fill="${color}"/>` +
    `<image href="data:image/png;base64,${MARK_ICON_BASE64}" width="512" height="512"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function mimeTypeForIcon(url: string): string {
  if (url.startsWith('data:image/svg+xml')) return 'image/svg+xml';
  if (url.startsWith('data:image/png')) return 'image/png';
  return url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
}
