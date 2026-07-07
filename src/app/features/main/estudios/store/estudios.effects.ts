import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EstudioService } from '../estudio.service';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
  loadEstudiosTodos,
  loadEstudiosTodosSuccess,
} from './estudios.actions';

@Injectable()
export class EstudiosEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(EstudioService);

  loadEstudios$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEstudios),
      // switchMap: un cambio de paciente cancela la request en vuelo del anterior.
      switchMap(({ patientId }) =>
        this.service.getEstudios(patientId).pipe(
          map(estudios => loadEstudiosSuccess({ patientId, estudios })),
          catchError((error: HttpErrorResponse) =>
            of(loadEstudiosFailure({ error })),
          ),
        ),
      ),
    ),
  );

  // "Todos": el back es por-paciente, así que se hace fan-out y se fusionan
  // las listas en el cliente (no existe endpoint de familia).
  loadEstudiosTodos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEstudiosTodos),
      switchMap(({ patientIds }) =>
        patientIds.length === 0
          ? of(loadEstudiosTodosSuccess({ estudios: [] }))
          : forkJoin(patientIds.map(id => this.service.getEstudios(id))).pipe(
              map(lists => loadEstudiosTodosSuccess({ estudios: lists.flat() })),
              catchError((error: HttpErrorResponse) =>
                of(loadEstudiosFailure({ error })),
              ),
            ),
      ),
    ),
  );
}
