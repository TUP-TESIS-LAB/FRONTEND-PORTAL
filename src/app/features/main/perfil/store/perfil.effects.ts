import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of, switchMap } from 'rxjs';
import { PerfilService } from '../perfil.service';
import * as A from './perfil.actions';

@Injectable()
export class PerfilEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(PerfilService);

  loadProfile$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadProfile),
    switchMap(({ patientId }) => this.svc.getPerfil(patientId).pipe(
      map(profile => A.loadProfileSuccess({ profile })), catchError(error => of(A.loadProfileFailure({ error }))))),
  ));

  registerAsPatient$ = createEffect(() => this.actions$.pipe(
    ofType(A.registerAsPatient),
    concatMap(() => this.svc.registerAsPatient().pipe(
      map(({ patientId }) => A.registerAsPatientSuccess({ patientId })),
      catchError(error => of(A.registerAsPatientFailure({ error }))))),
  ));

  updateProfile$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateProfile),
    concatMap(({ payload, patientId }) => this.svc.updatePerfil(payload, patientId).pipe(
      map(profile => A.updateProfileSuccess({ profile })), catchError(error => of(A.updateProfileFailure({ error }))))),
  ));

  changePassword$ = createEffect(() => this.actions$.pipe(
    ofType(A.changePassword),
    concatMap(({ currentPassword, newPassword }) => this.svc.changePassword(currentPassword, newPassword).pipe(
      map(() => A.changePasswordSuccess()), catchError(error => of(A.changePasswordFailure({ error }))))),
  ));
}
