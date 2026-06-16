import { createReducer, on } from '@ngrx/store';
import { initialPasswordRecoveryState } from './password-recovery.state';
import * as A from './password-recovery.actions';

export const passwordRecoveryReducer = createReducer(
  initialPasswordRecoveryState,
  on(A.requestReset, s => ({ ...s, submitting: true, error: null })),
  on(A.requestResetSuccess, s => ({ ...s, submitting: false, emailSent: true })),
  on(A.requestResetFailure, (s, { error }) => ({ ...s, submitting: false, error })),
  on(A.validateToken, s => ({ ...s, tokenStatus: 'checking' as const, error: null })),
  on(A.validateTokenSuccess, s => ({ ...s, tokenStatus: 'valid' as const })),
  on(A.validateTokenFailure, (s, { error }) => ({ ...s, tokenStatus: 'invalid' as const, error })),
  on(A.resetPassword, s => ({ ...s, submitting: true, error: null })),
  on(A.resetPasswordSuccess, s => ({ ...s, submitting: false, resetDone: true })),
  on(A.resetPasswordFailure, (s, { error }) => ({ ...s, submitting: false, error })),
);
