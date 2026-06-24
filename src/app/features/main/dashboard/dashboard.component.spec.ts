import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AppointmentService } from '../turnos/services/appointment.service';
import { EstudioService } from '../estudios/estudio.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ActivePatientService } from '../../../core/active-patient/active-patient.service';
import type { Familiar } from '../../../core/models/familiar.model';

function makeFam(id: number): Familiar {
  return {
    id,
    userPatientId: id,
    status: 'VERIFIED',
    nombre: 'Test',
    apellido: 'User',
    iniciales: 'TU',
    edad: 30,
    vinculo: 'Yo',
    dni: '12345678',
    cobertura: '',
    totalTurnos: 0,
    totalEstudios: 0,
    accentColor: 'primary',
  };
}

describe('DashboardComponent — active patient wiring', () => {
  let injector: Injector;

  const aptSvcStub = {
    getMyAppointments: vi.fn(() => of({ proximos: [], anteriores: [] })),
  };
  const estudioSvcStub = {
    getEstudios: vi.fn(() => of([])),
  };
  const authStub = {
    currentUser: signal(null as any),
  };
  const activePatientSignal = signal<Familiar | null>(makeFam(5));
  const activePatientStub = { activePatient: activePatientSignal };

  beforeEach(() => {
    aptSvcStub.getMyAppointments.mockClear();
    estudioSvcStub.getEstudios.mockClear();
    activePatientSignal.set(makeFam(5));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AppointmentService, useValue: aptSvcStub },
        { provide: EstudioService,     useValue: estudioSvcStub },
        { provide: AuthService,        useValue: authStub },
        { provide: ActivePatientService, useValue: activePatientStub },
      ],
    });
    injector = TestBed.inject(Injector);
  });

  it('carga el proximo turno del paciente activo', () => {
    runInInjectionContext(injector, () => new DashboardComponent());
    TestBed.flushEffects();
    expect(aptSvcStub.getMyAppointments).toHaveBeenCalledWith(5);
  });

  it('re-fetches when active patient changes', () => {
    runInInjectionContext(injector, () => new DashboardComponent());
    aptSvcStub.getMyAppointments.mockClear();
    TestBed.flushEffects();
    activePatientSignal.set(makeFam(99));
    TestBed.flushEffects();
    expect(aptSvcStub.getMyAppointments).toHaveBeenCalledWith(99);
  });
});
