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
 * Mapea la respuesta cruda del back al modelo del portal.
 *
 * `disponible` salía hardcodeado en `false` esperando KAN-168. KAN-168 ya está: el backend
 * manda `reportAvailable` y `reportId` en `GET /api/v1/me/results`. Mientras esto siguió
 * clavado, un estudio CLOSED con su informe FINAL firmado se le mostraba al paciente como
 * "En proceso" y con la descarga deshabilitada — no podía bajar su resultado.
 */
export function fromAnalyticalResult(dto: AnalyticalResultResponse): Estudio {
  const ts = new Date(dto.collectionDate).getTime();
  const disponible = dto.reportAvailable === true && dto.reportId != null;
  return {
    id: dto.id,
    patientId: dto.patientId,
    protocolId: dto.protocolId,
    analysisOrderId: dto.analysisOrderId,
    sectionId: dto.sectionId,
    // Persona se completa en el componente con el paciente seleccionado.
    personaId: dto.patientId,
    personaNombre: '',
    personaIniciales: '',
    nombre: dto.analysisName ?? `Estudio Nº ${dto.protocolId}`,
    fecha: formatFecha(dto.collectionDate),
    fechaTs: isNaN(ts) ? 0 : ts,
    estado: disponible ? 'disponible' : 'en-proceso',
    estadoLabel: disponible ? 'Disponible' : 'En proceso',
    esNuevo: false,
    reporteDisponible: disponible,
    reportId: dto.reportId,
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
   * Descarga del PDF firmado. Apuntaba a `/api/v1/me/studies/{id}/report`, que no existe:
   * el endpoint real es `/api/v1/me/results/reports/{reportId}/pdf` y toma el id del INFORME,
   * no el del estudio. El backend valida que el informe pertenezca al paciente (anti-IDOR).
   */
  descargarReporte(reportId: number): Observable<Blob> {
    return this.http.get(`/api/v1/me/results/reports/${reportId}/pdf`, {
      responseType: 'blob',
    });
  }
}
