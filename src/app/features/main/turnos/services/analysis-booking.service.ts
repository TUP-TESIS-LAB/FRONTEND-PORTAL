import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalysisBooking, AnalysisBookingDetail } from '../../../../core/models/analysis-booking.model';

export interface OrderPreparation {
  fastingHours: number | null;
  types: { code: string; label: string }[];
  observations: string[];
}

@Injectable({ providedIn: 'root' })
export class AnalysisBookingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/analysis/booking';

  search(q: string): Observable<AnalysisBooking[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<AnalysisBooking[]>(this.baseUrl, { params });
  }

  getDetail(id: number): Observable<AnalysisBookingDetail> {
    return this.http.get<AnalysisBookingDetail>(`${this.baseUrl}/${id}`);
  }

  /** Preparación (ayuno, etc.) computada para el conjunto de análisis elegidos. */
  computePreparation(analysisCatalogIds: number[]): Observable<OrderPreparation> {
    return this.http.post<OrderPreparation>('/api/v1/analitica/preparation/compute', { analysisCatalogIds });
  }
}
