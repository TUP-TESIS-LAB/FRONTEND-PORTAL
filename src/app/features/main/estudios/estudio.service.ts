import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalyticalResultResponse, Estudio } from '../../../core/models/estudio.model';

/** Formatea un ISO LocalDateTime del back a 'DD/MM/YYYY'. */
function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Mapea la respuesta cruda del back al modelo mínimo del portal. Los campos
 * ricos (sucursal, nombre, estadoFirma, reporteDisponible) quedan `undefined`
 * hasta que el endpoint KAN-168 los provea.
 */
export function fromAnalyticalResult(dto: AnalyticalResultResponse): Estudio {
  const ts = new Date(dto.collectionDate).getTime();
  return {
    id: dto.id,
    patientId: dto.patientId,
    protocolId: dto.protocolId,
    analysisOrderId: dto.analysisOrderId,
    sectionId: dto.sectionId,
    fecha: formatFecha(dto.collectionDate),
    fechaTs: isNaN(ts) ? 0 : ts,
  };
}

@Injectable({ providedIn: 'root' })
export class EstudioService {
  private readonly http = inject(HttpClient);

  /** Estudios del paciente indicado (scoped por familia + tenant en el back). */
  getEstudios(patientId: number): Observable<Estudio[]> {
    return this.http
      .get<AnalyticalResultResponse[]>('/api/v1/me/results', {
        params: { patientId: String(patientId) },
      })
      .pipe(map(list => list.map(fromAnalyticalResult)));
  }

  /**
   * Descarga del PDF firmado del estudio. Se habilita cuando exista el
   * endpoint de backend KAN-168 (`GET /api/v1/me/studies/{id}/report`).
   */
  descargarReporte(estudioId: number): Observable<Blob> {
    return this.http.get(`/api/v1/me/studies/${estudioId}/report`, {
      responseType: 'blob',
    });
  }
}
