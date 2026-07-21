import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TurnosState } from './turnos.state';

export const selectTurnos = createFeatureSelector<TurnosState>('turnos');
export const selectRescheduling = createSelector(selectTurnos, s => s.rescheduling);
export const selectRescheduledId = createSelector(selectTurnos, s => s.rescheduledId);
export const selectRescheduleError = createSelector(selectTurnos, s => s.error);
