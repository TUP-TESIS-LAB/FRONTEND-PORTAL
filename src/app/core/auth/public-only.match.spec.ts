import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { publicOnlyMatch } from './public-only.match';
import { AuthService } from './auth.service';

function run(logueado: boolean): boolean {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { isAuthenticated: signal(logueado) } }],
  });
  const injector = TestBed.inject(Injector);
  // CanMatchFn recibe (route, segments); acá no los usa, pero hay que pasarlos.
  return runInInjectionContext(
    injector,
    () => publicOnlyMatch({ path: 'ayuda' }, []),
  ) as boolean;
}

describe('publicOnlyMatch', () => {
  it('matchea la ruta pública cuando no hay sesión', () => {
    expect(run(false)).toBe(true);
  });

  // No redirige: devuelve false para que el router siga evaluando y el usuario
  // logueado caiga en la ruta hija del shell (misma URL, con navegación).
  it('declina el match cuando hay sesión', () => {
    expect(run(true)).toBe(false);
  });
});
