import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EstudiosState, ESTUDIOS_KEY } from './estudios.state';

export const selectEstudiosState = createFeatureSelector<EstudiosState>(ESTUDIOS_KEY);

export const selectEstudios = createSelector(
  selectEstudiosState,
  state => state.estudios,
);

export const selectEstudiosLoading = createSelector(
  selectEstudiosState,
  state => state.loading,
);

export const selectEstudiosError = createSelector(
  selectEstudiosState,
  state => state.error,
);
