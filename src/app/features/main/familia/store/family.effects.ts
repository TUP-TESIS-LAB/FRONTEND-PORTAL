import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, map, of, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FamilyService } from '../../../../core/family/family.service';
import {
  loadFamily,
  loadFamilySuccess,
  loadFamilyFailure,
  addFamilyMember,
  addFamilyMemberSuccess,
  addFamilyMemberFailure,
  removeFamilyMember,
  removeFamilyMemberSuccess,
  removeFamilyMemberFailure,
} from './family.actions';

@Injectable()
export class FamilyEffects {
  private readonly actions$ = inject(Actions);
  private readonly familyService = inject(FamilyService);

  loadFamily$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFamily),
      switchMap(() =>
        this.familyService.getFamily().pipe(
          map(family => loadFamilySuccess({ family })),
          catchError((error: HttpErrorResponse) =>
            of(loadFamilyFailure({ error })),
          ),
        ),
      ),
    ),
  );

  addFamilyMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addFamilyMember),
      concatMap(({ payload }) =>
        this.familyService.addFamilyMember(payload).pipe(
          map(() => addFamilyMemberSuccess()),
          catchError((error: HttpErrorResponse) =>
            of(addFamilyMemberFailure({ error })),
          ),
        ),
      ),
    ),
  );

  reloadAfterAdd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addFamilyMemberSuccess),
      map(() => loadFamily()),
    ),
  );

  removeFamilyMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeFamilyMember),
      concatMap(({ userPatientId }) =>
        this.familyService.removeFamilyMember(userPatientId).pipe(
          map(() => removeFamilyMemberSuccess({ userPatientId })),
          catchError((error: HttpErrorResponse) =>
            of(removeFamilyMemberFailure({ error })),
          ),
        ),
      ),
    ),
  );
}
