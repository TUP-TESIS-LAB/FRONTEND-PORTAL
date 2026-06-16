import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PasswordRecoveryState } from './password-recovery.state';

export const selectPasswordRecovery = createFeatureSelector<PasswordRecoveryState>('passwordRecovery');
export const selectSubmitting = createSelector(selectPasswordRecovery, s => s.submitting);
export const selectEmailSent = createSelector(selectPasswordRecovery, s => s.emailSent);
export const selectTokenStatus = createSelector(selectPasswordRecovery, s => s.tokenStatus);
export const selectResetDone = createSelector(selectPasswordRecovery, s => s.resetDone);
export const selectError = createSelector(selectPasswordRecovery, s => s.error);
