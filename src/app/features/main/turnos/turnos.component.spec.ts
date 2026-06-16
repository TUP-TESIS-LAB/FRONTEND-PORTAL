import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { TurnosComponent } from './turnos.component';
import { initialTurnosState } from './store/turnos.state';
import * as A from './store/turnos.actions';
import { AppointmentService } from './services/appointment.service';

describe('TurnosComponent reprogramar', () => {
  let store: MockStore; let injector: Injector;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { turnos: initialTurnosState } }),
        MessageService, ConfirmationService,
        { provide: AppointmentService, useValue: {
            getMyAppointments: () => of({ proximos: [], anteriores: [] }),
            getAvailability: () => of([{ hora: '09:00', disponible: true }]),
        } },
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
