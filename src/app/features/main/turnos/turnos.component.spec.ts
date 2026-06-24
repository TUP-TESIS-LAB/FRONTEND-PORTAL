import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { TurnosComponent } from './turnos.component';
import { initialTurnosState } from './store/turnos.state';
import * as A from './store/turnos.actions';
import { AppointmentService } from './services/appointment.service';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import type { Familiar } from '../../../core/models/familiar.model';

function makeFam(id: number): Familiar {
  return {
    id, userPatientId: id, status: 'VERIFIED',
    nombre: 'Test', apellido: 'User', iniciales: 'TU',
    edad: 30, vinculo: 'Yo', dni: '12345678',
    cobertura: '', totalTurnos: 0, totalEstudios: 0,
    accentColor: 'primary',
  };
}

describe('TurnosComponent reprogramar', () => {
  let store: MockStore; let injector: Injector;
  const aptSvcStub = {
    getMyAppointments: vi.fn(() => of({ proximos: [], anteriores: [] })),
    getAvailability: () => of([{ hora: '09:00', disponible: true }]),
  };
  const activePatientStub = { activePatient: signal<Familiar | null>(makeFam(1)) };

  beforeEach(() => {
    aptSvcStub.getMyAppointments.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { turnos: initialTurnosState } }),
        MessageService, ConfirmationService,
        { provide: AppointmentService, useValue: aptSvcStub },
        { provide: ActivePatientService, useValue: activePatientStub },
      ],
    });
    store = TestBed.inject(MockStore);
    injector = TestBed.inject(Injector);
  });

  it('confirmReprogramar dispatches reschedule with composed datetime', () => {
    const cmp = runInInjectionContext(injector, () => new TurnosComponent());
    const spy = vi.spyOn(store, 'dispatch');
    cmp.reprogramarTurnoId.set(5);
    cmp.reprogramarFecha.set(new Date(2026, 6, 1));
    cmp.reprogramarHora.set('09:00');
    cmp.confirmReprogramar();
    expect(spy).toHaveBeenCalledWith(A.reschedule({ id: 5, newScheduledAt: '2026-07-01T09:00:00' }));
  });
});

describe('TurnosComponent — active patient wiring', () => {
  let injector: Injector;
  const aptSvcStub = {
    getMyAppointments: vi.fn(() => of({ proximos: [], anteriores: [] })),
    getAvailability: () => of([]),
  };
  const activePatientSignal = signal<Familiar | null>(makeFam(7));
  const activePatientStub = { activePatient: activePatientSignal };

  beforeEach(() => {
    aptSvcStub.getMyAppointments.mockClear();
    activePatientSignal.set(makeFam(7));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { turnos: initialTurnosState } }),
        MessageService, ConfirmationService,
        { provide: AppointmentService, useValue: aptSvcStub },
        { provide: ActivePatientService, useValue: activePatientStub },
      ],
    });
    injector = TestBed.inject(Injector);
  });

  it('calls getMyAppointments(7) on init when active patient is 7', () => {
    runInInjectionContext(injector, () => new TurnosComponent());
    TestBed.flushEffects();
    expect(aptSvcStub.getMyAppointments).toHaveBeenCalledWith(7);
  });

  it('re-fetches when active patient changes', () => {
    runInInjectionContext(injector, () => new TurnosComponent());
    aptSvcStub.getMyAppointments.mockClear();
    // Change active patient — effect should re-run
    TestBed.flushEffects();
    activePatientSignal.set(makeFam(42));
    TestBed.flushEffects();
    expect(aptSvcStub.getMyAppointments).toHaveBeenCalledWith(42);
  });
});
