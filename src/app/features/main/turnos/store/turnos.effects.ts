import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of } from 'rxjs';
import { AppointmentService } from '../services/appointment.service';
import * as A from './turnos.actions';

@Injectable()
export class TurnosEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(AppointmentService);

  reschedule$ = createEffect(() => this.actions$.pipe(
    ofType(A.reschedule),
    concatMap(({ id, newScheduledAt }) => this.svc.reschedule(id, newScheduledAt).pipe(
      map(() => A.rescheduleSuccess({ id })),
      catchError(error => of(A.rescheduleFailure({ error }))))),
  ));
}
