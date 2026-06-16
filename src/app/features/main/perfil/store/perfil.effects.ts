import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of } from 'rxjs';
import { PerfilService } from '../perfil.service';
import * as A from './perfil.actions';

@Injectable()
export class PerfilEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(PerfilService);

  changePassword$ = createEffect(() => this.actions$.pipe(
    ofType(A.changePassword),
    concatMap(({ currentPassword, newPassword }) => this.svc.changePassword(currentPassword, newPassword).pipe(
      map(() => A.changePasswordSuccess()), catchError(error => of(A.changePasswordFailure({ error }))))),
  ));
}
