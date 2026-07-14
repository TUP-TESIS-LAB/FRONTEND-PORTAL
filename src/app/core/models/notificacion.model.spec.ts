import { describe, expect, it } from 'vitest';
import { fromPortalNotification, PortalNotificationItemResponse } from './notificacion.model';

describe('fromPortalNotification', () => {
  const dto: PortalNotificationItemResponse = {
    id: 1,
    patientId: 100,
    reportId: 200,
    type: 'REPORT_AVAILABLE',
    read: false,
    createdAt: '2026-07-14T12:00:00Z',
  };

  it('mapea el DTO crudo al modelo de dominio', () => {
    const n = fromPortalNotification(dto);
    expect(n.id).toBe(1);
    expect(n.patientId).toBe(100);
    expect(n.reportId).toBe(200);
    expect(n.read).toBe(false);
    expect(n.createdAt).toEqual(new Date('2026-07-14T12:00:00Z'));
  });
});
