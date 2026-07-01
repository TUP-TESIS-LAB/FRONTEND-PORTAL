/**
 * Mapeo de íconos de tipos de análisis.
 *
 * El backend (`GET /api/v1/turnos/catalog/tipos-analisis`) devuelve nombres de
 * Material Icons (`monitor_heart`, `bloodtype`, `biotech`, ...) que no existen
 * en PrimeIcons. Este helper los traduce a clases PrimeIcons válidas, con
 * fallback por categoría y un default genérico.
 *
 * REGLA: todo valor acá listado debe existir como svg en
 * `node_modules/primeicons/raw-svg/` (lo verifica el spec).
 */

/** Material Icons conocidos del backend → clase PrimeIcons completa. */
export const MATERIAL_TO_PI: Record<string, string> = {
  bloodtype:     'pi pi-heart',
  monitor_heart: 'pi pi-wave-pulse',
  biotech:       'pi pi-search',
  water_drop:    'pi pi-filter',
  science:       'pi pi-chart-line',
};

/** Categoría normalizada (lowercase, sin acentos) → clase PrimeIcons completa. */
export const CATEGORIA_TO_PI: Record<string, string> = {
  hematologia: 'pi pi-heart',
  bioquimica:  'pi pi-chart-line',
  hormonas:    'pi pi-sync',
  orina:       'pi pi-filter',
  coagulacion: 'pi pi-shield',
};

/** Ícono genérico cuando no hay match ni por ícono ni por categoría. */
export const DEFAULT_ANALYSIS_ICON = 'pi pi-file';

/** Normaliza una categoría: lowercase y sin acentos ("Bioquímica" → "bioquimica"). */
function normalizeCategoria(categoria: string): string {
  return categoria
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Resuelve la clase CSS del ícono para un tipo de análisis.
 *
 * Prioridad:
 * 1. Material Icon conocido del backend → PrimeIcon equivalente.
 * 2. `icono` ya es una clase PrimeIcon (`pi-xxx` o `pi pi-xxx`) → passthrough.
 * 3. Fallback por `categoria` (tolerante a mayúsculas y acentos).
 * 4. Default genérico.
 *
 * Siempre devuelve la clase completa `'pi pi-xxx'`.
 */
export function analysisIcon(
  icono: string | null | undefined,
  categoria?: string | null,
): string {
  const raw = icono?.trim() ?? '';

  if (raw) {
    const mapped = MATERIAL_TO_PI[raw];
    if (mapped) return mapped;

    if (raw.startsWith('pi pi-')) return raw;
    if (raw.startsWith('pi-')) return `pi ${raw}`;
  }

  if (categoria) {
    const fallback = CATEGORIA_TO_PI[normalizeCategoria(categoria)];
    if (fallback) return fallback;
  }

  return DEFAULT_ANALYSIS_ICON;
}
