import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

export const reschedule = createAction('[Turnos Page] Reschedule', props<{ id: number; newScheduledAt: string }>());
export const rescheduleSuccess = createAction('[Turnos API] Reschedule Success', props<{ id: number }>());
export const rescheduleFailure = createAction('[Turnos API] Reschedule Failure', props<{ error: HttpErrorResponse }>());
