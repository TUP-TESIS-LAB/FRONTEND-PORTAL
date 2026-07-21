import { HttpErrorResponse } from '@angular/common/http';
import { AnalysisBooking, AnalysisBookingDetail } from '../../../../core/models/analysis-booking.model';

export interface TurnosState {
  rescheduling: boolean;
  rescheduledId: number | null;
  error: HttpErrorResponse | null;

  // Búsqueda de análisis para sacar turno (catálogo real, mismo que atención).
  analisisResults: AnalysisBooking[];
  analisisSearchPending: boolean;
  analisisSearchError: HttpErrorResponse | null;

  // Detalle (con determinations) de los análisis seleccionados en el wizard.
  // Se acumula a medida que el paciente selecciona — necesario porque una
  // búsqueda nueva reemplaza analisisResults, pero la selección debe seguir
  // resolviendo determinationIds aunque el ítem ya no esté en el último
  // resultado de búsqueda.
  analisisDetails: AnalysisBookingDetail[];
  // Ids con el detalle todavía resolviéndose — array, no boolean: con
  // mergeMap puede haber más de una selección en vuelo a la vez.
  analisisPendingIds: number[];
  analisisDetailError: HttpErrorResponse | null;

  fastingHours: number | null;
}

export const initialTurnosState: TurnosState = {
  rescheduling: false,
  rescheduledId: null,
  error: null,

  analisisResults: [],
  analisisSearchPending: false,
  analisisSearchError: null,

  analisisDetails: [],
  analisisPendingIds: [],
  analisisDetailError: null,

  fastingHours: null,
};
