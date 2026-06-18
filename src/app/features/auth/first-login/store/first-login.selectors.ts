import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FirstLoginState, FIRST_LOGIN_KEY } from './first-login.state';

export const selectFirstLogin = createFeatureSelector<FirstLoginState>(FIRST_LOGIN_KEY);
export const selectFirstLoginSubmitting = createSelector(selectFirstLogin, s => s.submitting);
export const selectFirstLoginDone = createSelector(selectFirstLogin, s => s.done);
export const selectFirstLoginError = createSelector(selectFirstLogin, s => s.error);
