import { createReducer, on } from '@ngrx/store';
import { initialPerfilState } from './perfil.state';
import * as A from './perfil.actions';

export const perfilReducer = createReducer(
  initialPerfilState,
  on(A.changePassword, s => ({ ...s, passwordChanging: true, passwordChanged: false, error: null })),
  on(A.changePasswordSuccess, s => ({ ...s, passwordChanging: false, passwordChanged: true })),
  on(A.changePasswordFailure, (s, { error }) => ({ ...s, passwordChanging: false, error })),
);
