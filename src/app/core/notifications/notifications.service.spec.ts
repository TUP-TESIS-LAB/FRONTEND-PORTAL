import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;

  const inboxBody = {
    items: [
      { id: 1, patientId: 100, reportId: 200, type: 'REPORT_AVAILABLE', read: false, createdAt: '2026-07-14T12:00:00Z' },
    ],
    unreadCount: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getInbox mapea items y guarda el ETag para el proximo poll', () =>
    new Promise<void>(done => {
      service.getInbox().subscribe(inbox => {
        expect(inbox?.unreadCount).toBe(1);
        expect(inbox?.items[0].reportId).toBe(200);
        done();
      });
      const req = httpMock.expectOne('/api/v1/me/notifications');
      expect(req.request.headers.has('If-None-Match')).toBe(false);
      req.flush(inboxBody, { headers: { ETag: 'W/"abc"' } });
    }));

  it('getInbox manda If-None-Match y devuelve null en 304', () =>
    new Promise<void>(done => {
      // primer GET fija el etag
      service.getInbox().subscribe();
      httpMock.expectOne('/api/v1/me/notifications').flush(inboxBody, { headers: { ETag: 'W/"abc"' } });

      service.getInbox().subscribe(inbox => {
        expect(inbox).toBeNull();
        done();
      });
      const second = httpMock.expectOne('/api/v1/me/notifications');
      expect(second.request.headers.get('If-None-Match')).toBe('W/"abc"');
      second.flush(null, { status: 304, statusText: 'Not Modified' });
    }));

  it('markRead postea los ids', () =>
    new Promise<void>(done => {
      service.markRead([1, 2]).subscribe(() => done());
      const req = httpMock.expectOne('/api/v1/me/notifications/read');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids: [1, 2] });
      req.flush(null, { status: 204, statusText: 'No Content' });
    }));

  it('getVapidPublicKey devuelve la clave', () =>
    new Promise<void>(done => {
      service.getVapidPublicKey().subscribe(key => {
        expect(key).toBe('BPublicKey');
        done();
      });
      httpMock.expectOne('/api/v1/me/push-subscriptions/vapid-public-key').flush({ publicKey: 'BPublicKey' });
    }));

  it('registerSubscription postea endpoint y claves', () =>
    new Promise<void>(done => {
      service
        .registerSubscription({ endpoint: 'https://push/e1', p256dh: 'k', auth: 'a', userAgent: 'UA' })
        .subscribe(() => done());
      const req = httpMock.expectOne('/api/v1/me/push-subscriptions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.endpoint).toBe('https://push/e1');
      req.flush(null, { status: 204, statusText: 'No Content' });
    }));
});
