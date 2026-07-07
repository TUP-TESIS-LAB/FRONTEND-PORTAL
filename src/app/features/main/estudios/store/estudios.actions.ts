import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Estudio } from '../../../../core/models/estudio.model';

export const loadEstudios = createAction(
  '[Estudios Page] Load Estudios',
  props<{ patientId: number }>(),
);
export const loadEstudiosSuccess = createAction(
  '[Estudios API] Load Estudios Success',
  props<{ patientId: number; estudios: Estudio[] }>(),
);
export const loadEstudiosFailure = createAction(
  '[Estudios API] Load Estudios Failure',
  props<{ error: HttpErrorResponse }>(),
);

// ── "Todos" (fan-out sobre la familia) ──────────────────────
export const loadEstudiosTodos = createAction(
  '[Estudios Page] Load Estudios Todos',
  props<{ patientIds: number[] }>(),
);
export const loadEstudiosTodosSuccess = createAction(
  '[Estudios API] Load Estudios Todos Success',
  props<{ estudios: Estudio[] }>(),
);
