import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { TurnoDetailComponent } from './turno-detail.component';
import type { Turno } from '../../../../core/models/turno.model';

// Fixture mínima: solo importa fechaTs para headerLabel
function makeTurno(fechaTs: number): Turno {
  return {
    id: 1, personaId: 1, personaNombre: 'Carlos', personaIniciales: 'CG',
    dia: '15', mes: 'JUL', fechaCompleta: 'Martes 15 de julio', hora: '09:00',
    fechaTs,
    tipo: 'Análisis de sangre', estudios: ['Hemograma'],
    sede: { id: '1', nombre: 'Sede Central', direccion: 'Av. Test 123' },
    estado: 'confirmado',
    preparacion: [], llegarMinAntes: 15, ordenCargada: false,
  };
}

describe('TurnoDetailComponent — headerLabel', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  // Instanciación directa (el componente usa inject(), así que necesita
  // contexto de inyección) — el runner no resuelve templateUrl, prohibido
  // TestBed.createComponent.
  function makeCmp(fechaTs: number): TurnoDetailComponent {
    const cmp = runInInjectionContext(injector, () => new TurnoDetailComponent());
    cmp.turno = makeTurno(fechaTs);
    return cmp;
  }

  it('turno futuro → "TU PRÓXIMO TURNO"', () => {
    const cmp = makeCmp(Date.now() + 60 * 60 * 1000); // dentro de 1 hora
    expect(cmp.headerLabel).toBe('TU PRÓXIMO TURNO');
  });

  it('turno pasado → "DETALLE DEL TURNO"', () => {
    const cmp = makeCmp(Date.now() - 60 * 60 * 1000); // hace 1 hora
    expect(cmp.headerLabel).toBe('DETALLE DEL TURNO');
  });

  it('fechaTs NaN → "DETALLE DEL TURNO"', () => {
    const cmp = makeCmp(NaN);
    expect(cmp.headerLabel).toBe('DETALLE DEL TURNO');
  });

  it('fechaTs undefined → "DETALLE DEL TURNO"', () => {
    const cmp = runInInjectionContext(injector, () => new TurnoDetailComponent());
    cmp.turno = { ...makeTurno(0), fechaTs: undefined } as unknown as Turno;
    expect(cmp.headerLabel).toBe('DETALLE DEL TURNO');
  });
});

describe('TurnoDetailComponent — hasDireccion', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('null, vacía o placeholder "—" no cuentan como dirección', () => {
    const cmp = runInInjectionContext(injector, () => new TurnoDetailComponent());
    expect(cmp.hasDireccion(null)).toBe(false);
    expect(cmp.hasDireccion(undefined)).toBe(false);
    expect(cmp.hasDireccion('  ')).toBe(false);
    expect(cmp.hasDireccion('—')).toBe(false);
    expect(cmp.hasDireccion('Av. Test 123')).toBe(true);
  });
});
