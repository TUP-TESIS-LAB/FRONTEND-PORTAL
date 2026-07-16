/** Item crudo del backend: `GET /api/v1/me/notifications` (rol EXTERNO). */
export interface PortalNotificationItemResponse {
  id: number;
  patientId: number;
  reportId: number;
  type: 'REPORT_AVAILABLE';
  read: boolean;
  createdAt: string; // ISO Instant
}

/** Respuesta completa de la bandeja. Endpoint polleable (ETag/304). */
export interface PortalNotificationInboxResponse {
  items: PortalNotificationItemResponse[];
  unreadCount: number;
}

export interface Notificacion {
  id: number;
  patientId: number;
  reportId: number;
  type: 'REPORT_AVAILABLE';
  read: boolean;
  createdAt: Date;
}

export function fromPortalNotification(dto: PortalNotificationItemResponse): Notificacion {
  return {
    id: dto.id,
    patientId: dto.patientId,
    reportId: dto.reportId,
    type: dto.type,
    read: dto.read,
    createdAt: new Date(dto.createdAt),
  };
}
