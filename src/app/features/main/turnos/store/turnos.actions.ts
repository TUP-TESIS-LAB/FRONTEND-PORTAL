import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalysisBooking, AnalysisBookingDetail } from '../../../../core/models/analysis-booking.model';

export const reschedule = createAction('[Turnos Page] Reschedule', props<{ id: number; newScheduledAt: string }>());
export const rescheduleSuccess = createAction('[Turnos API] Reschedule Success', props<{ id: number }>());
export const rescheduleFailure = createAction('[Turnos API] Reschedule Failure', props<{ error: HttpErrorResponse }>());
export const rescheduleHandled = createAction('[Turnos Page] Reschedule Handled');

// ─── Búsqueda de análisis (paso "sacar turno") ───────────────────────
export const searchAnalisis = createAction('[Sacar Turno Page] Search Analisis', props<{ q: string }>());
export const searchAnalisisSuccess = createAction('[Turnos API] Search Analisis Success', props<{ results: AnalysisBooking[] }>());
export const searchAnalisisFailure = createAction('[Turnos API] Search Analisis Failure', props<{ error: HttpErrorResponse }>());
export const clearAnalisisSearch = createAction('[Sacar Turno Page] Clear Analisis Search');

// ─── Selección de análisis: resuelve el detalle (determinations) ────
export const selectAnalisis = createAction('[Sacar Turno Page] Select Analisis', props<{ id: number }>());
export const selectAnalisisSuccess = createAction('[Turnos API] Select Analisis Success', props<{ detail: AnalysisBookingDetail }>());
export const selectAnalisisFailure = createAction('[Turnos API] Select Analisis Failure', props<{ id: number; error: HttpErrorResponse }>());
export const deselectAnalisis = createAction('[Sacar Turno Page] Deselect Analisis', props<{ id: number }>());

// ─── Preparación (ayuno) del conjunto seleccionado ───────────────────
export const computeAyuno = createAction('[Sacar Turno Page] Compute Ayuno', props<{ analysisCatalogIds: number[] }>());
export const computeAyunoSuccess = createAction('[Turnos API] Compute Ayuno Success', props<{ fastingHours: number | null }>());
export const computeAyunoFailure = createAction('[Turnos API] Compute Ayuno Failure', props<{ error: HttpErrorResponse }>());
