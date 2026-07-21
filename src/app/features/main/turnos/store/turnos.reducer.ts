import { createReducer, on } from '@ngrx/store';
import { TurnosState, initialTurnosState } from './turnos.state';
import * as A from './turnos.actions';

export const turnosReducer = createReducer(
  initialTurnosState,
  on(A.reschedule, s => ({ ...s, rescheduling: true, rescheduledId: null, error: null })),
  on(A.rescheduleSuccess, (s, { id }) => ({ ...s, rescheduling: false, rescheduledId: id })),
  on(A.rescheduleFailure, (s, { error }) => ({ ...s, rescheduling: false, error })),
  on(A.rescheduleHandled, s => ({ ...s, rescheduledId: null })),

  on(A.searchAnalisis, (s): TurnosState => ({ ...s, analisisSearchPending: true, analisisSearchError: null })),
  on(A.searchAnalisisSuccess, (s, { results }): TurnosState => ({
    ...s, analisisResults: results, analisisSearchPending: false, analisisSearchError: null,
  })),
  on(A.searchAnalisisFailure, (s, { error }): TurnosState => ({
    ...s, analisisSearchPending: false, analisisSearchError: error,
  })),
  on(A.clearAnalisisSearch, (s): TurnosState => ({ ...s, analisisResults: [], analisisSearchError: null })),

  on(A.selectAnalisis, (s, { id }): TurnosState => ({
    ...s, analisisPendingIds: [...s.analisisPendingIds, id], analisisDetailError: null,
  })),
  on(A.selectAnalisisSuccess, (s, { detail }): TurnosState => ({
    ...s,
    analisisDetails: s.analisisDetails.some(d => d.id === detail.id)
      ? s.analisisDetails
      : [...s.analisisDetails, detail],
    analisisPendingIds: s.analisisPendingIds.filter(i => i !== detail.id),
  })),
  on(A.selectAnalisisFailure, (s, { id, error }): TurnosState => ({
    ...s, analisisPendingIds: s.analisisPendingIds.filter(i => i !== id), analisisDetailError: error,
  })),
  on(A.deselectAnalisis, (s, { id }): TurnosState => ({
    ...s, analisisDetails: s.analisisDetails.filter(d => d.id !== id),
  })),

  on(A.computeAyunoSuccess, (s, { fastingHours }): TurnosState => ({ ...s, fastingHours })),
  on(A.computeAyunoFailure, (s): TurnosState => ({ ...s, fastingHours: null })),
);
