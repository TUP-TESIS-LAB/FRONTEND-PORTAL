import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

const MESSAGE_MAP: Record<string, string> = {
  SlotUnavailableException: 'Ese horario ya no está disponible. Elegí otro.',
  MinimumAdvanceBookingException: 'No se puede reservar para esa fecha. Elegí una fecha de hoy en adelante.',
  CancellationWindowExpiredException: 'Ya no se puede cancelar (faltan menos de 24h).',
  InvalidBookingDateException: 'Esa fecha no es válida.',
  ModuleDisabledException: 'Esta función no está habilitada para este laboratorio.',
};

const STATUS_FALLBACK: Record<number, string> = {
  401: 'Sesión expirada. Iniciá sesión de nuevo.',
  403: 'No tenés acceso a este recurso.',
  409: 'Esos datos ya están registrados.',
  500: 'Ocurrió un error en el servidor. Intentá más tarde.',
  503: 'El servicio no está disponible. Intentá más tarde.',
};

const GENERIC = 'Ocurrió un error. Intentá de nuevo.';

export function mapApiError(err: HttpErrorResponse): string {
  const body = err.error as Partial<ApiErrorResponse> | null | undefined;

  if (body?.message && MESSAGE_MAP[body.message]) {
    return MESSAGE_MAP[body.message];
  }

  if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
    const parts = Object.entries(body.fieldErrors).map(
      ([field, msg]) => `${field}: ${msg}`,
    );
    return parts.join('. ');
  }

  if (body?.message) return body.message;

  if (STATUS_FALLBACK[err.status]) {
    return STATUS_FALLBACK[err.status];
  }

  return GENERIC;
}
