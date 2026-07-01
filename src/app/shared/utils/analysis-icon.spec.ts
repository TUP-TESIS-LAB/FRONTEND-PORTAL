import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  analysisIcon,
  CATEGORIA_TO_PI,
  DEFAULT_ANALYSIS_ICON,
  MATERIAL_TO_PI,
} from './analysis-icon';

describe('analysisIcon', () => {
  describe('material icons conocidos del backend', () => {
    it('mapea bloodtype al ícono de hematología', () => {
      expect(analysisIcon('bloodtype')).toBe('pi pi-heart');
    });

    it('mapea monitor_heart', () => {
      expect(analysisIcon('monitor_heart')).toBe('pi pi-wave-pulse');
    });

    it('mapea biotech', () => {
      expect(analysisIcon('biotech')).toBe('pi pi-search');
    });

    it('mapea water_drop', () => {
      expect(analysisIcon('water_drop')).toBe('pi pi-filter');
    });

    it('mapea science', () => {
      expect(analysisIcon('science')).toBe('pi pi-chart-line');
    });
  });

  describe('passthrough de clases PrimeIcons', () => {
    it('completa el prefijo cuando recibe pi-xxx', () => {
      expect(analysisIcon('pi-heart')).toBe('pi pi-heart');
    });

    it('respeta la clase completa pi pi-xxx', () => {
      expect(analysisIcon('pi pi-calendar')).toBe('pi pi-calendar');
    });
  });

  describe('fallback por categoría', () => {
    it('resuelve "Bioquímica" (con acento y mayúscula)', () => {
      expect(analysisIcon('desconocido', 'Bioquímica')).toBe(CATEGORIA_TO_PI['bioquimica']);
    });

    it('resuelve "Hematología"', () => {
      expect(analysisIcon(null, 'Hematología')).toBe(CATEGORIA_TO_PI['hematologia']);
    });

    it('resuelve categorías ya normalizadas', () => {
      expect(analysisIcon(undefined, 'orina')).toBe(CATEGORIA_TO_PI['orina']);
      expect(analysisIcon(undefined, 'hormonas')).toBe(CATEGORIA_TO_PI['hormonas']);
      expect(analysisIcon(undefined, 'coagulacion')).toBe(CATEGORIA_TO_PI['coagulacion']);
    });

    it('usa la categoría cuando el ícono es un material icon desconocido', () => {
      expect(analysisIcon('vaccines', 'Coagulación')).toBe(CATEGORIA_TO_PI['coagulacion']);
    });
  });

  describe('default genérico', () => {
    it('devuelve el default con todo null/undefined', () => {
      expect(analysisIcon(null)).toBe(DEFAULT_ANALYSIS_ICON);
      expect(analysisIcon(undefined, undefined)).toBe(DEFAULT_ANALYSIS_ICON);
      expect(analysisIcon(null, null)).toBe(DEFAULT_ANALYSIS_ICON);
    });

    it('devuelve el default con ícono y categoría desconocidos', () => {
      expect(analysisIcon('vaccines', 'genetica')).toBe(DEFAULT_ANALYSIS_ICON);
    });

    it('devuelve el default con strings vacíos', () => {
      expect(analysisIcon('', '')).toBe(DEFAULT_ANALYSIS_ICON);
    });
  });

  describe('todos los PrimeIcons usados existen en primeicons/raw-svg', () => {
    const svgDir = join(process.cwd(), 'node_modules', 'primeicons', 'raw-svg');

    const allValues = [
      ...Object.values(MATERIAL_TO_PI),
      ...Object.values(CATEGORIA_TO_PI),
      DEFAULT_ANALYSIS_ICON,
    ];

    it('el directorio raw-svg existe', () => {
      expect(existsSync(svgDir)).toBe(true);
    });

    it.each(allValues)('%s tiene su svg', (cls) => {
      const svgs = new Set(readdirSync(svgDir));
      expect(cls).toMatch(/^pi pi-[a-z0-9-]+$/);
      const name = cls.replace(/^pi pi-/, '');
      expect(svgs.has(`${name}.svg`)).toBe(true);
    });
  });
});
