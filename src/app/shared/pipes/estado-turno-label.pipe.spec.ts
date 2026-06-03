import { describe, it, expect } from 'vitest';
import { EstadoTurnoLabelPipe } from './estado-turno-label.pipe';

describe('EstadoTurnoLabelPipe', () => {
  const pipe = new EstadoTurnoLabelPipe();

  it('mapea pendiente y confirmado a "Programado"', () => {
    expect(pipe.transform('pendiente')).toBe('Programado');
    expect(pipe.transform('confirmado')).toBe('Programado');
  });

  it('mapea completado a "Asistido"', () => {
    expect(pipe.transform('completado')).toBe('Asistido');
  });

  it('mapea cancelado a "Cancelado"', () => {
    expect(pipe.transform('cancelado')).toBe('Cancelado');
  });

  it('devuelve string vacio para null o undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
