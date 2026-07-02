import { createReducer, on } from '@ngrx/store';
import { EstudiosState, initialEstudiosState } from './estudios.state';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
} from './estudios.actions';

export const estudiosReducer = createReducer(
  initialEstudiosState,

  on(loadEstudios, (state, { patientId }): EstudiosState => ({
    ...state,
    patientId,
    loading: true,
    error: null,
  })),
  on(loadEstudiosSuccess, (state, { patientId, estudios }): EstudiosState => ({
    ...state,
    patientId,
    estudios,
    loading: false,
    error: null,
  })),
  on(loadEstudiosFailure, (state, { error }): EstudiosState => ({
    ...state,
    estudios: [],
    loading: false,
    error,
  })),
);
