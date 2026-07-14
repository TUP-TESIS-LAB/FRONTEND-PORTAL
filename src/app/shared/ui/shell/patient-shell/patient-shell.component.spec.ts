import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PatientShellComponent } from './patient-shell.component';
import { TenantService } from '../../../../core/tenant/tenant.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ActivePatientService } from '../../../../core/active-patient/active-patient.service';
import { PushService } from '../../../../core/push/push.service';
import { NOTIFICATIONS_KEY, initialNotificationsState } from '../../../../core/notifications/store/notifications.state';
import { startNotificationsPolling, stopNotificationsPolling, markNotificationsRead } from '../../../../core/notifications/store/notifications.actions';
import type { Familiar } from '../../../../core/models/familiar.model';
import type { Notificacion } from '../../../../core/models/notificacion.model';

function fam(id: number, nombre: string): Familiar {
  return {
    id, userPatientId: id, status: 'VERIFIED', nombre, apellido: 'A',
    iniciales: nombre[0], edad: 30, vinculo: 'Yo', dni: '1',
    tieneCuenta: false, cobertura: '', totalTurnos: 0, totalEstudios: 0,
    accentColor: 'primary',
  };
}

function notif(id: number, patientId: number): Notificacion {
  return { id, patientId, reportId: id * 10, type: 'REPORT_AVAILABLE', read: false, createdAt: new Date('2026-07-14T12:00:00Z') };
}

describe('PatientShellComponent', () => {
  let injector: Injector;
  let store: MockStore;
  const navigate = vi.fn();
  const logout = vi.fn();
  const pushInit = vi.fn();
  const accessibleSignal = signal<Familiar[]>([fam(10, 'Carlos')]);

  beforeEach(() => {
    navigate.mockClear();
    logout.mockClear();
    pushInit.mockClear();
    accessibleSignal.set([fam(10, 'Carlos')]);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: TenantService, useValue: { config: signal({ id: 'lab-demo', shortName: 'LD', fullName: 'Lab Demo' }) } },
        {
          provide: AuthService,
          useValue: { currentUser: () => ({ nombre: 'Carlos García', dni: '30123456' }), logout },
        },
        { provide: ActivePatientService, useValue: { init: vi.fn(), accessiblePatients: accessibleSignal.asReadonly() } },
        { provide: PushService, useValue: { init: pushInit } },
        provideMockStore({
          initialState: {
            [NOTIFICATIONS_KEY]: { ...initialNotificationsState, items: [notif(1, 10)], unreadCount: 1 },
          },
        }),
      ],
    });
    injector = TestBed.inject(Injector);
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
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

  it('ngOnInit inicializa push y arranca el polling de notificaciones', () => {
    const cmp = runInInjectionContext(injector, () => new PatientShellComponent());
    cmp.ngOnInit();
    expect(pushInit).toHaveBeenCalledOnce();
    expect(store.dispatch).toHaveBeenCalledWith(startNotificationsPolling());
  });

  it('ngOnDestroy detiene el polling', () => {
    const cmp = runInInjectionContext(injector, () => new PatientShellComponent());
    cmp.ngOnDestroy();
    expect(store.dispatch).toHaveBeenCalledWith(stopNotificationsPolling());
  });

  it('notifItems mapea las notificaciones al nombre del familiar', () => {
    const cmp = runInInjectionContext(injector, () => new PatientShellComponent());
    expect(cmp.notifItems()).toEqual([
      { id: '1', icon: 'pi-file-check', label: 'Nuevo informe disponible', message: 'Carlos', route: ['/estudios'] },
    ]);
  });

  it('openNotifications abre la bandeja y marca todas como leidas', () => {
    const cmp = runInInjectionContext(injector, () => new PatientShellComponent());
    cmp.openNotifications();
    expect(cmp.notifOpen()).toBe(true);
    expect(store.dispatch).toHaveBeenCalledWith(markNotificationsRead({ ids: [] }));
  });
});
