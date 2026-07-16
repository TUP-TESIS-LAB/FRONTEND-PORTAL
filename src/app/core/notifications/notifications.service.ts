import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import {
  Notificacion,
  PortalNotificationInboxResponse,
  fromPortalNotification,
} from '../models/notificacion.model';

export interface Inbox {
  items: Notificacion[];
  unreadCount: number;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

/**
 * HTTP de la bandeja + suscripciones push del portal.
 * El GET de la bandeja es POLLEABLE: guarda el ETag y manda If-None-Match;
 * un 304 se traduce a `null` ("sin cambios") para que el effect lo filtre.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private etag: string | null = null;

  getInbox(): Observable<Inbox | null> {
    let headers = new HttpHeaders();
    if (this.etag) {
      headers = headers.set('If-None-Match', this.etag);
    }
    return this.http
      .get<PortalNotificationInboxResponse>('/api/v1/me/notifications', { headers, observe: 'response' })
      .pipe(
        map(res => {
          this.etag = res.headers.get('ETag');
          const body = res.body!;
          return { items: body.items.map(fromPortalNotification), unreadCount: body.unreadCount };
        }),
        catchError((err: HttpErrorResponse) =>
          err.status === 304 ? of(null) : throwError(() => err),
        ),
      );
  }

  /** ids vacío = marcar todas. */
  markRead(ids: number[]): Observable<void> {
    return this.http.post<void>('/api/v1/me/notifications/read', { ids });
  }

  getVapidPublicKey(): Observable<string> {
    return this.http
      .get<{ publicKey: string }>('/api/v1/me/push-subscriptions/vapid-public-key')
      .pipe(map(r => r.publicKey));
  }

  registerSubscription(payload: PushSubscriptionPayload): Observable<void> {
    return this.http.post<void>('/api/v1/me/push-subscriptions', payload);
  }

  unregisterSubscription(endpoint: string): Observable<void> {
    return this.http.request<void>('DELETE', '/api/v1/me/push-subscriptions', { body: { endpoint } });
  }
}
