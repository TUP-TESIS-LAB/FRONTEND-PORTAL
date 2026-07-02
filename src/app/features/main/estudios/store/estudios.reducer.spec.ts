import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { estudiosReducer } from './estudios.reducer';
import { initialEstudiosState } from './estudios.state';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
} from './estudios.actions';
import type { Estudio } from '../../../../core/models/estudio.model';

const ESTUDIO: Estudio = { id: 1, patientId: 10, protocolId: 5, fecha: '01/01/2026', fechaTs: 1 };

describe('estudiosReducer', () => {
  it('loadEstudios activa loading, guarda patientId y limpia error', () => {
    const state = estudiosReducer(
      { ...initialEstudiosState, error: new HttpErrorResponse({ status: 500 }) },
      loadEstudios({ patientId: 10 }),
    );
    expect(state.loading).toBe(true);
    expect(state.patientId).toBe(10);
    expect(state.error).toBeNull();
  });

  it('loadEstudiosSuccess setea estudios y apaga loading', () => {
    const state = estudiosReducer(
      { ...initialEstudiosState, loading: true },
      loadEstudiosSuccess({ patientId: 10, estudios: [ESTUDIO] }),
    );
    expect(state.estudios).toEqual([ESTUDIO]);
    expect(state.patientId).toBe(10);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadEstudiosFailure limpia estudios, apaga loading y guarda error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const state = estudiosReducer(
      { ...initialEstudiosState, loading: true, estudios: [ESTUDIO] },
      loadEstudiosFailure({ error }),
    );
    expect(state.estudios).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(error);
  });
});
