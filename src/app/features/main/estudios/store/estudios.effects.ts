import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EstudioService } from '../estudio.service';
import {
  loadEstudios,
  loadEstudiosSuccess,
  loadEstudiosFailure,
  descargarReporte,
  descargarReporteSuccess,
  descargarReporteFailure,
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

  // Descarga del PDF firmado (KAN-168). La petición pasa por la store (regla del repo);
  // el blob NO se guarda en state: se abre en una pestaña como efecto y se libera la URL.
  descargarReporte$ = createEffect(() =>
    this.actions$.pipe(
      ofType(descargarReporte),
      mergeMap(({ reportId }) =>
        this.service.descargarReporte(reportId).pipe(
          tap(blob => {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
          }),
          map(() => descargarReporteSuccess()),
          catchError((error: HttpErrorResponse) =>
            of(descargarReporteFailure({ error })),
          ),
        ),
      ),
    ),
  );
}
