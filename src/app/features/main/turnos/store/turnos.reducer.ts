import { createReducer, on } from '@ngrx/store';
import { initialTurnosState } from './turnos.state';
import * as A from './turnos.actions';

export const turnosReducer = createReducer(
  initialTurnosState,
  on(A.reschedule, s => ({ ...s, rescheduling: true, rescheduledId: null, error: null })),
  on(A.rescheduleSuccess, (s, { id }) => ({ ...s, rescheduling: false, rescheduledId: id })),
  on(A.rescheduleFailure, (s, { error }) => ({ ...s, rescheduling: false, error })),
);
