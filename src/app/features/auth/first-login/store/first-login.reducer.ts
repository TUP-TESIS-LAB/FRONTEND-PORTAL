import { createReducer, on } from '@ngrx/store';
import { initialFirstLoginState } from './first-login.state';
import * as A from './first-login.actions';

export const firstLoginReducer = createReducer(
  initialFirstLoginState,
  on(A.resetFirstLogin, () => initialFirstLoginState),
  on(A.setFirstLoginPassword, s => ({ ...s, submitting: true, error: null })),
  on(A.setFirstLoginPasswordSuccess, s => ({ ...s, submitting: false, done: true, error: null })),
  on(A.setFirstLoginPasswordFailure, (s, { error }) => ({ ...s, submitting: false, error })),
);
