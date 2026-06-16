import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PerfilState } from './perfil.state';

export const selectPerfil = createFeatureSelector<PerfilState>('perfil');
export const selectUser = createSelector(selectPerfil, s => s.user);
export const selectLoading = createSelector(selectPerfil, s => s.loading);
export const selectSaving = createSelector(selectPerfil, s => s.saving);
export const selectPasswordChanging = createSelector(selectPerfil, s => s.passwordChanging);
export const selectPasswordChanged = createSelector(selectPerfil, s => s.passwordChanged);
export const selectError = createSelector(selectPerfil, s => s.error);
