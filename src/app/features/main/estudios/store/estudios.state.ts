import { HttpErrorResponse } from '@angular/common/http';
import { Estudio } from '../../../../core/models/estudio.model';

export interface EstudiosState {
  estudios: Estudio[];
  /** patientId cuyos estudios están cargados (para dedup/UX). */
  patientId: number | null;
  loading: boolean;
  error: HttpErrorResponse | null;
  /** Descarga de PDF en curso (KAN-168). */
  descargando: boolean;
  /** Último error de descarga; el componente lo muestra como toast. */
  descargaError: HttpErrorResponse | null;
}

export const initialEstudiosState: EstudiosState = {
  estudios: [],
  patientId: null,
  loading: false,
  error: null,
  descargando: false,
  descargaError: null,
};

export const ESTUDIOS_KEY = 'estudios';
