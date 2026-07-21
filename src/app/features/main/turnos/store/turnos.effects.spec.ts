import { describe, it, expect } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TurnosEffects } from './turnos.effects';
import { AppointmentService } from '../services/appointment.service';
import { AnalysisBookingService } from '../services/analysis-booking.service';
import * as A from './turnos.actions';
function setup(svc: Partial<AppointmentService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1); actions$.next(action);
  TestBed.configureTestingModule({ providers: [TurnosEffects, provideMockActions(() => actions$), { provide: AppointmentService, useValue: svc }, { provide: AnalysisBookingService, useValue: {} }] });
  return TestBed.inject(TurnosEffects);
}
function setupAnalisis(svc: Partial<AnalysisBookingService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1); actions$.next(action);
  TestBed.configureTestingModule({ providers: [TurnosEffects, provideMockActions(() => actions$), { provide: AppointmentService, useValue: {} }, { provide: AnalysisBookingService, useValue: svc }] });
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

  it('searchAnalisis → success (con el debounce de 250ms)', () => new Promise<void>(done => {
    const results = [{ id: 1, name: 'Glucemia', familyName: 'Bioquímica' }];
    const eff = setupAnalisis({ search: () => of(results) }, A.searchAnalisis({ q: 'gluc' }));
    eff.searchAnalisis$.subscribe(a => { expect(a).toEqual(A.searchAnalisisSuccess({ results })); done(); });
  }));

  it('searchAnalisis → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 500 });
    const eff = setupAnalisis({ search: () => throwError(() => err) }, A.searchAnalisis({ q: 'gluc' }));
    eff.searchAnalisis$.subscribe(a => { expect(a).toEqual(A.searchAnalisisFailure({ error: err })); done(); });
  }));

  it('selectAnalisis → success', () => new Promise<void>(done => {
    const detail = { id: 1, name: 'Hemograma', familyName: 'Hematología', determinations: [{ id: 10, name: 'GR' }] };
    const eff = setupAnalisis({ getDetail: () => of(detail) }, A.selectAnalisis({ id: 1 }));
    eff.selectAnalisis$.subscribe(a => { expect(a).toEqual(A.selectAnalisisSuccess({ detail })); done(); });
  }));

  it('selectAnalisis → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 404 });
    const eff = setupAnalisis({ getDetail: () => throwError(() => err) }, A.selectAnalisis({ id: 1 }));
    eff.selectAnalisis$.subscribe(a => { expect(a).toEqual(A.selectAnalisisFailure({ id: 1, error: err })); done(); });
  }));

  it('computeAyuno con selección vacía no pega al backend, resuelve fastingHours null', () => new Promise<void>(done => {
    const eff = setupAnalisis({ computePreparation: () => { throw new Error('no debería llamarse'); } }, A.computeAyuno({ analysisCatalogIds: [] }));
    eff.computeAyuno$.subscribe(a => { expect(a).toEqual(A.computeAyunoSuccess({ fastingHours: null })); done(); });
  }));

  it('computeAyuno → success', () => new Promise<void>(done => {
    const eff = setupAnalisis({ computePreparation: () => of({ fastingHours: 8, types: [], observations: [] }) }, A.computeAyuno({ analysisCatalogIds: [1, 2] }));
    eff.computeAyuno$.subscribe(a => { expect(a).toEqual(A.computeAyunoSuccess({ fastingHours: 8 })); done(); });
  }));

  it('computeAyuno → failure', () => new Promise<void>(done => {
    const err = new HttpErrorResponse({ status: 500 });
    const eff = setupAnalisis({ computePreparation: () => throwError(() => err) }, A.computeAyuno({ analysisCatalogIds: [1] }));
    eff.computeAyuno$.subscribe(a => { expect(a).toEqual(A.computeAyunoFailure({ error: err })); done(); });
  }));
});
