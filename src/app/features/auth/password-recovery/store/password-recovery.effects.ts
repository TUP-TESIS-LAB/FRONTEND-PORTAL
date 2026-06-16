import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import * as A from './password-recovery.actions';

@Injectable()
export class PasswordRecoveryEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(PasswordRecoveryService);

  requestReset$ = createEffect(() => this.actions$.pipe(
    ofType(A.requestReset),
    exhaustMap(({ email }) => this.svc.forgot(email).pipe(
      map(() => A.requestResetSuccess()), catchError(error => of(A.requestResetFailure({ error }))))),
  ));

  validateToken$ = createEffect(() => this.actions$.pipe(
    ofType(A.validateToken),
    switchMap(({ token }) => this.svc.validateToken(token).pipe(
      map(() => A.validateTokenSuccess()), catchError(error => of(A.validateTokenFailure({ error }))))),
  ));

  resetPassword$ = createEffect(() => this.actions$.pipe(
    ofType(A.resetPassword),
    exhaustMap(({ token, newPassword }) => this.svc.reset(token, newPassword).pipe(
      map(() => A.resetPasswordSuccess()), catchError(error => of(A.resetPasswordFailure({ error }))))),
  ));
}
