import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { mapApiError } from './api-error-mapper';

function build(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('mapApiError', () => {
  it('maps SlotUnavailableException', () => {
    expect(mapApiError(build(400, { message: 'SlotUnavailableException' })))
      .toBe('Ese horario ya no está disponible. Elegí otro.');
  });

  it('maps MinimumAdvanceBookingException', () => {
    expect(mapApiError(build(400, { message: 'MinimumAdvanceBookingException' })))
      .toBe('Hay que reservar con al menos 2 días de anticipación.');
  });

  it('maps CancellationWindowExpiredException', () => {
    expect(mapApiError(build(400, { message: 'CancellationWindowExpiredException' })))
      .toBe('Ya no se puede cancelar (faltan menos de 24h).');
  });

  it('maps 401 to session expired', () => {
    expect(mapApiError(build(401, {}))).toBe('Sesión expirada. Iniciá sesión de nuevo.');
  });

  it('maps 403 to no access', () => {
    expect(mapApiError(build(403, {}))).toBe('No tenés acceso a este recurso.');
  });

  it('maps 409 to duplicate generic', () => {
    expect(mapApiError(build(409, {}))).toBe('Esos datos ya están registrados.');
  });

  it('concatenates fieldErrors', () => {
    const result = mapApiError(build(400, {
      message: 'Validation failed',
      fieldErrors: { dni: 'must be 7-8 digits', email: 'invalid format' }
    }));
    expect(result).toContain('dni');
    expect(result).toContain('email');
  });

  it('falls back to message', () => {
    expect(mapApiError(build(500, { message: 'Boom' }))).toBe('Boom');
  });

  it('falls back to generic when no info', () => {
    expect(mapApiError(build(500, {})))
      .toBe('Ocurrió un error en el servidor. Intentá más tarde.');
  });
});
