import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AppointmentService } from '../turnos/services/appointment.service';
import { EstudioService } from '../estudios/estudio.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Turno } from '../../../core/models/turno.model';

function makeTurno(id: number, fechaTs: number): Turno {
  return {
    id, personaId: id, personaNombre: 'P' + id, personaIniciales: 'P',
    dia: '01', mes: 'ENE', fechaCompleta: 'x', hora: '09:00', fechaTs,
    tipo: 'Análisis', estudios: [],
    sede: { id: '1', nombre: 'Sede', direccion: '' },
    estado: 'pendiente', preparacion: [], llegarMinAntes: 10, ordenCargada: false,
  };
}

describe('DashboardComponent — próximo turno (el más cercano de cualquiera)', () => {
  let injector: Injector;

  const aptSvcStub = {
    getMyAppointments: vi.fn(() => of({ proximos: [] as Turno[], anteriores: [] as Turno[] })),
  };
  const estudioSvcStub = { getEstudios: vi.fn(() => of([])) };
  const authStub = { currentUser: signal(null as any) };

  beforeEach(() => {
    aptSvcStub.getMyAppointments.mockClear();
    aptSvcStub.getMyAppointments.mockReturnValue(of({ proximos: [], anteriores: [] }));
    estudioSvcStub.getEstudios.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AppointmentService, useValue: aptSvcStub },
        { provide: EstudioService,     useValue: estudioSvcStub },
        { provide: AuthService,        useValue: authStub },
      ],
    });
    injector = TestBed.inject(Injector);
  });

  it('al iniciar carga TODOS los accesibles (getMyAppointments sin patientId)', () => {
    runInInjectionContext(injector, () => new DashboardComponent());
    expect(aptSvcStub.getMyAppointments).toHaveBeenCalledWith(undefined);
  });

  it('elige el turno futuro más cercano entre todos (menor fechaTs)', () => {
    const lejano  = makeTurno(1, 5000);
    const cercano = makeTurno(2, 1000);
    aptSvcStub.getMyAppointments.mockReturnValue(of({ proximos: [lejano, cercano], anteriores: [] }));

    let comp!: DashboardComponent;
    runInInjectionContext(injector, () => { comp = new DashboardComponent(); });

    expect((comp as any).proximoTurno()?.id).toBe(2);
    expect((comp as any).turnosCount()).toBe(2);
  });

  it('las notificaciones arrancan vacías (sin backend todavía, sin mock)', () => {
    let comp!: DashboardComponent;
    runInInjectionContext(injector, () => { comp = new DashboardComponent(); });

    expect((comp as any).notifications()).toEqual([]);
  });
});
