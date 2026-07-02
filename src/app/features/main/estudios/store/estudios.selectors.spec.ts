import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import {
  selectEstudios,
  selectEstudiosLoading,
  selectEstudiosError,
} from './estudios.selectors';
import { ESTUDIOS_KEY, EstudiosState } from './estudios.state';
import type { Estudio } from '../../../../core/models/estudio.model';

const ESTUDIO: Estudio = { id: 1, patientId: 10, protocolId: 5, fecha: '01/01/2026', fechaTs: 1 };

function root(state: Partial<EstudiosState>) {
  return {
    [ESTUDIOS_KEY]: {
      estudios: [], patientId: null, loading: false, error: null, ...state,
    } as EstudiosState,
  };
}

describe('estudios selectors', () => {
  it('selectEstudios devuelve la lista', () => {
    expect(selectEstudios(root({ estudios: [ESTUDIO] }))).toEqual([ESTUDIO]);
  });

  it('selectEstudiosLoading devuelve el flag', () => {
    expect(selectEstudiosLoading(root({ loading: true }))).toBe(true);
  });

  it('selectEstudiosError devuelve el error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    expect(selectEstudiosError(root({ error }))).toBe(error);
  });
});
