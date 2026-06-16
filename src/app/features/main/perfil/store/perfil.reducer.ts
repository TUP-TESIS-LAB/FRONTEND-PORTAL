import { createReducer, on } from '@ngrx/store';
import { initialPerfilState } from './perfil.state';
import * as A from './perfil.actions';

export const perfilReducer = createReducer(
  initialPerfilState,
  on(A.loadProfile, s => ({ ...s, loading: true, error: null })),
  on(A.loadProfileSuccess, (s, { profile }) => ({ ...s, loading: false, user: profile })),
  on(A.loadProfileFailure, (s, { error }) => ({ ...s, loading: false, error })),
  on(A.updateProfile, s => ({ ...s, saving: true, error: null })),
  on(A.updateProfileSuccess, (s, { profile }) => ({ ...s, saving: false, user: profile })),
  on(A.updateProfileFailure, (s, { error }) => ({ ...s, saving: false, error })),
  on(A.changePassword, s => ({ ...s, passwordChanging: true, passwordChanged: false, error: null })),
  on(A.changePasswordSuccess, s => ({ ...s, passwordChanging: false, passwordChanged: true })),
  on(A.changePasswordFailure, (s, { error }) => ({ ...s, passwordChanging: false, error })),
);
