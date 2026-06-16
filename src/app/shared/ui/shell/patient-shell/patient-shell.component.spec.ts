import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PatientShellComponent } from './patient-shell.component';
import { TenantService } from '../../../../core/tenant/tenant.service';
import { AuthService } from '../../../../core/auth/auth.service';

describe('PatientShellComponent', () => {
  let injector: Injector;
  const navigate = vi.fn();
  const logout = vi.fn();

  beforeEach(() => {
    navigate.mockClear();
    logout.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: TenantService, useValue: { config: signal({ id: 'lab-demo', shortName: 'LD', fullName: 'Lab Demo' }) } },
        {
          provide: AuthService,
          useValue: { currentUser: () => ({ nombre: 'Carlos García', dni: '30123456' }), logout },
        },
      ],
    });
    injector = TestBed.inject(Injector);
  });

  it('user() deriva nombre/apellido/iniciales del usuario logueado (no hardcodeado)', () => {
    const cmp = runInInjectionContext(injector, () => new PatientShellComponent());
    expect(cmp.user()).toEqual({ iniciales: 'CG', nombre: 'Carlos', apellido: 'García', dni: '30123456' });
  });

  it('logout() usa AuthService y navega a /login', () => {
    const cmp = runInInjectionContext(injector, () => new PatientShellComponent());
    cmp.logout();
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
