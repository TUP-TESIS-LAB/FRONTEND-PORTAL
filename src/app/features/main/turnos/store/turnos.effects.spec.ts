import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TurnosEffects } from './turnos.effects';
import { AppointmentService } from '../services/appointment.service';
import * as A from './turnos.actions';
function setup(svc: Partial<AppointmentService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1); actions$.next(action);
  TestBed.configureTestingModule({ providers: [TurnosEffects, provideMockActions(() => actions$), { provide: AppointmentService, useValue: svc }] });
  return TestBed.inject(TurnosEffects);
}
describe('TurnosEffects', () => {
  it('reschedule → success', () => new Promise<void>(done => {
    const eff = setup({ reschedule: () => of(void 0) }, A.reschedule({ id: 5, newScheduledAt: '2026-07-01T09:00:00' }));
    eff.reschedule$.subscribe(a => { expect(a).toEqual(A.rescheduleSuccess({ id: 5 })); done(); });
  }));
  it('reschedule → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 400 });
    const eff = setup({ reschedule: () => throwError(() => err) }, A.reschedule({ id: 5, newScheduledAt: 'x' }));
    eff.reschedule$.subscribe(a => { expect(a).toEqual(A.rescheduleFailure({ error: err })); done(); });
  }));
});
