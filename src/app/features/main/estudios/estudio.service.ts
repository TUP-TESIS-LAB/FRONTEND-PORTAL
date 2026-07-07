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
 * Mapea la respuesta cruda del back al modelo mínimo del portal. La disponibilidad
 * del informe firmado + su reportId llegan del back (KAN-168); el resto de los campos
 * ricos (sucursal, nombre, estadoFirma) siguen `undefined` y la UI los degrada.
 */
export function fromAnalyticalResult(dto: AnalyticalResultResponse): Estudio {
  const ts = new Date(dto.collectionDate).getTime();
  // Disponible solo si el back marca el informe firmado y trae su reportId (KAN-168).
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
    nombre: `Estudio Nº ${dto.protocolId}`,
    fecha: formatFecha(dto.collectionDate),
    fechaTs: isNaN(ts) ? 0 : ts,
    estado: disponible ? 'disponible' : 'en-proceso',
    estadoLabel: disponible ? 'Disponible' : 'En proceso',
    esNuevo: false,
    reporteDisponible: disponible,
    reportId: dto.reportId ?? undefined,
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
   * Descarga del PDF del informe FINAL firmado (KAN-168). El acceso lo acota el
   * back por vínculo familiar + tenant; 404 si aún no está firmado.
   */
  descargarReporte(reportId: number): Observable<Blob> {
    return this.http.get(`/api/v1/me/results/reports/${reportId}/pdf`, {
      responseType: 'blob',
    });
  }
}
