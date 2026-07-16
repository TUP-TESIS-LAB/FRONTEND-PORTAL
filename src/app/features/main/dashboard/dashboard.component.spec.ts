import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AppointmentService } from '../turnos/services/appointment.service';
import { EstudioService } from '../estudios/estudio.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PushService } from '../../../core/push/push.service';
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
  const pushSvcStub = {
    supported: () => false,
    enabled: () => false,
    permissionDenied: () => false,
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
  };

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
        { provide: PushService,        useValue: pushSvcStub },
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
});

const BANNER_DISMISSED_KEY = 'portal_push_banner_dismissed';

describe('DashboardComponent — banner de activación de notificaciones push', () => {
  let injector: Injector;

  const aptSvcStub = { getMyAppointments: vi.fn(() => of({ proximos: [], anteriores: [] })) };
  const estudioSvcStub = { getEstudios: vi.fn(() => of([])) };
  const authStub = { currentUser: signal(null as any) };

  function pushStub(overrides: Partial<{ supported: boolean; enabled: boolean; permissionDenied: boolean }> = {}) {
    const { supported = true, enabled = false, permissionDenied = false } = overrides;
    return {
      supported: () => supported,
      enabled: () => enabled,
      permissionDenied: () => permissionDenied,
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
    };
  }

  function build(pushSvc: ReturnType<typeof pushStub>): DashboardComponent {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AppointmentService, useValue: aptSvcStub },
        { provide: EstudioService,     useValue: estudioSvcStub },
        { provide: AuthService,        useValue: authStub },
        { provide: PushService,        useValue: pushSvc },
      ],
    });
    injector = TestBed.inject(Injector);
    let comp!: DashboardComponent;
    runInInjectionContext(injector, () => { comp = new DashboardComponent(); });
    return comp;
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('se muestra cuando supported && !enabled && !permissionDenied && !dismissed', () => {
    const comp = build(pushStub());
    expect((comp as any).showPushBanner()).toBe(true);
  });

  it('NO se muestra si el permiso está denegado', () => {
    const comp = build(pushStub({ permissionDenied: true }));
    expect((comp as any).showPushBanner()).toBe(false);
  });

  it('NO se muestra si ya está activado', () => {
    const comp = build(pushStub({ enabled: true }));
    expect((comp as any).showPushBanner()).toBe(false);
  });

  it('NO se muestra si el navegador no soporta push', () => {
    const comp = build(pushStub({ supported: false }));
    expect((comp as any).showPushBanner()).toBe(false);
  });

  it('descartar el banner persiste el flag en localStorage y lo oculta', () => {
    const comp = build(pushStub());
    expect((comp as any).showPushBanner()).toBe(true);

    (comp as any).dismissPushBanner();

    expect(localStorage.getItem(BANNER_DISMISSED_KEY)).toBe('true');
    expect((comp as any).showPushBanner()).toBe(false);
  });

  it('si el flag ya está seteado en localStorage al iniciar, el banner no se muestra', () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    const comp = build(pushStub());
    expect((comp as any).showPushBanner()).toBe(false);
  });

  it('click en "Activar notificaciones" llama a push.enable()', async () => {
    const push = pushStub();
    const comp = build(push);

    await (comp as any).activarNotificaciones();

    expect(push.enable).toHaveBeenCalled();
  });

  it('si tras enable() el permiso queda denegado, se descarta el banner (no insistir)', async () => {
    const push = pushStub({ permissionDenied: true });
    const comp = build(push);

    await (comp as any).activarNotificaciones();

    expect(localStorage.getItem(BANNER_DISMISSED_KEY)).toBe('true');
  });
});
