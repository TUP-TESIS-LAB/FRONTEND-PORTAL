import { describe, it, expect, vi, afterEach } from 'vitest';
import { of, throwError, ReplaySubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { EstudiosEffects } from './estudios.effects';
import { EstudioService } from '../estudio.service';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
  loadEstudiosTodos,
  loadEstudiosTodosSuccess,
  descargarReporte,
  descargarReporteSuccess,
  descargarReporteFailure,
} from './estudios.actions';
import type { Estudio } from '../../../../core/models/estudio.model';

const ESTUDIO: Estudio = { id: 1, patientId: 10, protocolId: 5, fecha: '01/01/2026', fechaTs: 1 };
const ESTUDIO_2: Estudio = { id: 2, patientId: 20, protocolId: 6, fecha: '02/01/2026', fechaTs: 2 };

function setup(svc: Partial<EstudioService>, action: Action) {
  const actions$ = new ReplaySubject<Action>(1);
  actions$.next(action);
  TestBed.configureTestingModule({
    providers: [
      EstudiosEffects,
      provideMockActions(() => actions$),
      { provide: EstudioService, useValue: svc },
    ],
  });
  return TestBed.inject(EstudiosEffects);
}

describe('EstudiosEffects', () => {
  it('loadEstudios$ despacha loadEstudiosSuccess en éxito', () => new Promise<void>(done => {
    const eff = setup({ getEstudios: () => of([ESTUDIO]) }, loadEstudios({ patientId: 10 }));
    eff.loadEstudios$.subscribe(a => {
      expect(a).toEqual(loadEstudiosSuccess({ patientId: 10, estudios: [ESTUDIO] }));
      done();
    });
  }));

  it('loadEstudios$ despacha loadEstudiosFailure en error', () => new Promise<void>(done => {
    const error = new HttpErrorResponse({ status: 500 });
    const eff = setup({ getEstudios: () => throwError(() => error) }, loadEstudios({ patientId: 10 }));
    eff.loadEstudios$.subscribe(a => {
      expect(a).toEqual(loadEstudiosFailure({ error }));
      done();
    });
  }));

  it('loadEstudiosTodos$ hace fan-out por paciente y fusiona los resultados', () => new Promise<void>(done => {
    const getEstudios = vi.fn((id: number) => of(id === 10 ? [ESTUDIO] : [ESTUDIO_2]));
    const eff = setup({ getEstudios }, loadEstudiosTodos({ patientIds: [10, 20] }));
    eff.loadEstudiosTodos$.subscribe(a => {
      expect(a).toEqual(loadEstudiosTodosSuccess({ estudios: [ESTUDIO, ESTUDIO_2] }));
      expect(getEstudios).toHaveBeenCalledWith(10);
      expect(getEstudios).toHaveBeenCalledWith(20);
      done();
    });
  }));

  it('loadEstudiosTodos$ despacha loadEstudiosTodosSuccess vacío sin pacientes', () => new Promise<void>(done => {
    const getEstudios = vi.fn();
    const eff = setup({ getEstudios }, loadEstudiosTodos({ patientIds: [] }));
    eff.loadEstudiosTodos$.subscribe(a => {
      expect(a).toEqual(loadEstudiosTodosSuccess({ estudios: [] }));
      expect(getEstudios).not.toHaveBeenCalled();
      done();
    });
  }));

  it('loadEstudiosTodos$ no aborta el batch si falla un solo paciente (ej. familiar sin acceso todavía)', () => new Promise<void>(done => {
    const error = new HttpErrorResponse({ status: 403 });
    const getEstudios = vi.fn((id: number) => id === 10 ? of([ESTUDIO]) : throwError(() => error));
    const eff = setup({ getEstudios }, loadEstudiosTodos({ patientIds: [10, 20] }));
    eff.loadEstudiosTodos$.subscribe(a => {
      // El paciente que falla aporta lista vacía — no esconde los estudios del resto.
      expect(a).toEqual(loadEstudiosTodosSuccess({ estudios: [ESTUDIO] }));
      done();
    });
  }));

  describe('descargarReporte$', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('abre el PDF en una pestaña y despacha success', () => new Promise<void>(done => {
      const createObjectURL = vi.fn(() => 'blob:fake');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      const open = vi.fn();
      vi.stubGlobal('open', open);

      const blob = new Blob(['%PDF'], { type: 'application/pdf' });
      const eff = setup({ descargarReporte: () => of(blob) }, descargarReporte({ reportId: 77 }));
      eff.descargarReporte$.subscribe(a => {
        expect(a).toEqual(descargarReporteSuccess());
        expect(createObjectURL).toHaveBeenCalledWith(blob);
        expect(open).toHaveBeenCalledWith('blob:fake', '_blank');
        done();
      });
    }));

    it('despacha failure en error', () => new Promise<void>(done => {
      const error = new HttpErrorResponse({ status: 404 });
      const eff = setup({ descargarReporte: () => throwError(() => error) }, descargarReporte({ reportId: 77 }));
      eff.descargarReporte$.subscribe(a => {
        expect(a).toEqual(descargarReporteFailure({ error }));
        done();
      });
    }));
  });
});
