import { createReducer, on } from '@ngrx/store';
import { EstudiosState, initialEstudiosState } from './estudios.state';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
  descargarReporte,
  descargarReporteSuccess,
  descargarReporteFailure,
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

  on(descargarReporte, (state): EstudiosState => ({
    ...state,
    descargando: true,
    descargaError: null,
  })),
  on(descargarReporteSuccess, (state): EstudiosState => ({
    ...state,
    descargando: false,
  })),
  on(descargarReporteFailure, (state, { error }): EstudiosState => ({
    ...state,
    descargando: false,
    descargaError: error,
  })),
);
