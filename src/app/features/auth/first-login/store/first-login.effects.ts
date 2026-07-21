import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { FirstLoginService } from '../services/first-login.service';
import * as A from './first-login.actions';

@Injectable()
export class FirstLoginEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(FirstLoginService);

  setPassword$ = createEffect(() => this.actions$.pipe(
    ofType(A.setFirstLoginPassword),
    exhaustMap(({ token, newPassword }) => this.svc.setPassword(token, newPassword).pipe(
      map(() => A.setFirstLoginPasswordSuccess()),
      catchError(error => of(A.setFirstLoginPasswordFailure({ error }))),
    )),
  ));
}
