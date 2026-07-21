import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TurnosState } from './turnos.state';

export const selectTurnos = createFeatureSelector<TurnosState>('turnos');
export const selectRescheduling = createSelector(selectTurnos, s => s.rescheduling);
export const selectRescheduledId = createSelector(selectTurnos, s => s.rescheduledId);
export const selectRescheduleError = createSelector(selectTurnos, s => s.error);

export const selectAnalisisResults = createSelector(selectTurnos, s => s.analisisResults);
export const selectAnalisisSearchPending = createSelector(selectTurnos, s => s.analisisSearchPending);
export const selectAnalisisSearchError = createSelector(selectTurnos, s => s.analisisSearchError);

export const selectAnalisisDetails = createSelector(selectTurnos, s => s.analisisDetails);
export const selectAnalisisPendingIds = createSelector(selectTurnos, s => s.analisisPendingIds);
export const selectAnalisisSelectedIds = createSelector(selectAnalisisDetails, details => details.map(d => d.id));

export const selectFastingHours = createSelector(selectTurnos, s => s.fastingHours);
export const selectRequiereAyuno = createSelector(selectFastingHours, hours => hours != null && hours > 0);
