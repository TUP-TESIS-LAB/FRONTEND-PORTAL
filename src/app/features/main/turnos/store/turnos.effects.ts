import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, debounceTime, map, mergeMap, of, switchMap } from 'rxjs';
import { AppointmentService } from '../services/appointment.service';
import { AnalysisBookingService } from '../services/analysis-booking.service';
import * as A from './turnos.actions';

@Injectable()
export class TurnosEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(AppointmentService);
  private readonly analysisSvc = inject(AnalysisBookingService);

  reschedule$ = createEffect(() => this.actions$.pipe(
    ofType(A.reschedule),
    concatMap(({ id, newScheduledAt }) => this.svc.reschedule(id, newScheduledAt).pipe(
      map(() => A.rescheduleSuccess({ id })),
      catchError(error => of(A.rescheduleFailure({ error }))))),
  ));

  // debounceTime: búsqueda en vivo mientras el paciente tipea (search-as-you-type).
  searchAnalisis$ = createEffect(() => this.actions$.pipe(
    ofType(A.searchAnalisis),
    debounceTime(250),
    switchMap(({ q }) => this.analysisSvc.search(q).pipe(
      map(results => A.searchAnalisisSuccess({ results })),
      catchError(error => of(A.searchAnalisisFailure({ error }))))),
  ));

  // mergeMap (no switchMap): cada selección debe resolverse de forma
  // independiente — si el paciente selecciona dos análisis rápido, un
  // switchMap cancelaría la primera petición y perderíamos ese detalle.
  selectAnalisis$ = createEffect(() => this.actions$.pipe(
    ofType(A.selectAnalisis),
    mergeMap(({ id }) => this.analysisSvc.getDetail(id).pipe(
      map(detail => A.selectAnalisisSuccess({ detail })),
      catchError(error => of(A.selectAnalisisFailure({ id, error }))))),
  ));

  // switchMap: solo importa el último cómputo — si la selección cambia de
  // nuevo antes de que responda, el resultado anterior queda obsoleto.
  computeAyuno$ = createEffect(() => this.actions$.pipe(
    ofType(A.computeAyuno),
    switchMap(({ analysisCatalogIds }) => {
      if (analysisCatalogIds.length === 0) {
        return of(A.computeAyunoSuccess({ fastingHours: null }));
      }
      return this.analysisSvc.computePreparation(analysisCatalogIds).pipe(
        map(r => A.computeAyunoSuccess({ fastingHours: r.fastingHours })),
        catchError(error => of(A.computeAyunoFailure({ error }))));
    }),
  ));
}
