import { describe, it, expect } from 'vitest';
import { EstadoTurnoKeyPipe } from './estado-turno-key.pipe';

describe('EstadoTurnoKeyPipe', () => {
  const pipe = new EstadoTurnoKeyPipe();

  it('mapea pendiente y confirmado a "programado"', () => {
    expect(pipe.transform('pendiente')).toBe('programado');
    expect(pipe.transform('confirmado')).toBe('programado');
  });

  it('mapea completado a "asistido"', () => {
    expect(pipe.transform('completado')).toBe('asistido');
  });

  it('mapea cancelado a "cancelado"', () => {
    expect(pipe.transform('cancelado')).toBe('cancelado');
  });

  it('cae a "cancelado" para null/undefined (estado desconocido = no mostrar como ok)', () => {
    expect(pipe.transform(null)).toBe('cancelado');
    expect(pipe.transform(undefined)).toBe('cancelado');
  });
});
