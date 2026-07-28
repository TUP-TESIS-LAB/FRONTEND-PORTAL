import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { AyudaComponent } from './ayuda.component';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/tenant/tenant.service';

function build(opts: { logueado: boolean; tenantConfig?: unknown }) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isAuthenticated: signal(opts.logueado) } },
      { provide: TenantService, useValue: { config: signal(opts.tenantConfig ?? null) } },
    ],
  });
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, () => new AyudaComponent());
}

describe('AyudaComponent', () => {
  it('deslogueado muestra solo Cuenta y acceso', () => {
    const cmp = build({ logueado: false });
    expect(cmp.categories().map(c => c.id)).toEqual(['cuenta']);
    expect(cmp.categories()[0].items).toHaveLength(3);
  });

  it('logueado muestra las 4 categorías y las 12 preguntas', () => {
    const cmp = build({ logueado: true });
    expect(cmp.categories()).toHaveLength(4);
    const total = cmp.categories().reduce((n, c) => n + c.items.length, 0);
    expect(total).toBe(12);
  });

  it('expone el contacto del tenant cuando está configurado', () => {
    const cmp = build({
      logueado: true,
      tenantConfig: {
        id: 'lab-demo', shortName: 'LD', fullName: 'Laboratorio Demo',
        contact: { helpPhone: '381 000 0000', helpEmail: 'contacto@labdemo.test' },
      },
    });
    expect(cmp.contact().helpPhone).toBe('381 000 0000');
    expect(cmp.contact().helpEmail).toBe('contacto@labdemo.test');
  });

  it('no rompe si el tenant todavía no cargó', () => {
    const cmp = build({ logueado: false, tenantConfig: null });
    expect(cmp.contact().helpPhone).toBeUndefined();
    expect(cmp.contact().helpEmail).toBeUndefined();
  });
});
