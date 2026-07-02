import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EstudioService } from '../estudio.service';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
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
}
