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
  const activePatientStub = { accessiblePatients: signal<Familiar[]>([makeFam(1)]) };

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

describe('TurnosComponent — carga contextual (todos por defecto)', () => {
  let injector: Injector;
  const aptSvcStub = {
    getMyAppointments: vi.fn(() => of({ proximos: [], anteriores: [] })),
    getAvailability: () => of([]),
  };
  const activePatientStub = { accessiblePatients: signal<Familiar[]>([makeFam(7), { ...makeFam(8), vinculo: 'Hijo' }]) };

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
    injector = TestBed.inject(Injector);
  });

  it('al iniciar carga TODOS los accesibles (getMyAppointments sin patientId)', () => {
    const cmp = runInInjectionContext(injector, () => new TurnosComponent());
    cmp.ngOnInit();
    expect(aptSvcStub.getMyAppointments).toHaveBeenCalledWith(undefined);
  });

  it('cambiar el filtro de paciente NO vuelve a pegarle al back (filtro client-side)', () => {
    const cmp = runInInjectionContext(injector, () => new TurnosComponent());
    cmp.ngOnInit();
    aptSvcStub.getMyAppointments.mockClear();
    cmp.selectedPatientId.set(7);
    expect(aptSvcStub.getMyAppointments).not.toHaveBeenCalled();
  });

  it('expone opciones de filtro por cada paciente accesible', () => {
    const cmp = runInInjectionContext(injector, () => new TurnosComponent());
    const opts = (cmp as unknown as { patientFilterOptions: () => unknown[] }).patientFilterOptions();
    expect(opts.length).toBe(2);
  });
});
