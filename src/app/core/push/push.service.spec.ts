import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from './push.service';

describe('PushService', () => {
  const fakeBrowserSub = {
    endpoint: 'https://push.example/e1',
    toJSON: () => ({ endpoint: 'https://push.example/e1', keys: { p256dh: 'k', auth: 'a' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;

  let swPushMock: {
    isEnabled: boolean;
    subscription: Subject<PushSubscription | null>;
    requestSubscription: ReturnType<typeof vi.fn>;
  };
  let notificationsMock: {
    getVapidPublicKey: ReturnType<typeof vi.fn>;
    registerSubscription: ReturnType<typeof vi.fn>;
    unregisterSubscription: ReturnType<typeof vi.fn>;
  };

  function build(): PushService {
    TestBed.configureTestingModule({
      providers: [
        { provide: SwPush, useValue: swPushMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    });
    return TestBed.inject(PushService);
  }

  beforeEach(() => {
    (fakeBrowserSub.unsubscribe as ReturnType<typeof vi.fn>).mockClear();
    swPushMock = {
      isEnabled: true,
      subscription: new Subject<PushSubscription | null>(),
      requestSubscription: vi.fn().mockResolvedValue(fakeBrowserSub),
    };
    notificationsMock = {
      getVapidPublicKey: vi.fn().mockReturnValue(of('BPublicKey')),
      registerSubscription: vi.fn().mockReturnValue(of(void 0)),
      unregisterSubscription: vi.fn().mockReturnValue(of(void 0)),
    };
  });

  it('supported=false cuando el SW esta deshabilitado (dev)', () => {
    swPushMock.isEnabled = false;
    const svc = build();
    expect(svc.supported()).toBe(false);
  });

  it('init refleja una suscripcion existente en enabled', () => {
    const svc = build();
    svc.init();
    swPushMock.subscription.next(fakeBrowserSub);
    expect(svc.enabled()).toBe(true);
  });

  it('enable pide la clave, suscribe y registra en el backend', async () => {
    const svc = build();
    await svc.enable();
    expect(swPushMock.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: 'BPublicKey' });
    expect(notificationsMock.registerSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/e1', p256dh: 'k', auth: 'a' }),
    );
    expect(svc.enabled()).toBe(true);
  });

  it('enable con permiso denegado marca permissionDenied sin registrar', async () => {
    swPushMock.requestSubscription = vi.fn().mockRejectedValue(new Error('Permission denied'));
    const svc = build();
    await svc.enable();
    expect(svc.permissionDenied()).toBe(true);
    expect(notificationsMock.registerSubscription).not.toHaveBeenCalled();
  });

  it('enable con fallo del backend hace rollback de la suscripcion del navegador', async () => {
    notificationsMock.registerSubscription = vi.fn().mockReturnValue(throwError(() => new Error('500')));
    const svc = build();
    await svc.enable();
    expect(fakeBrowserSub.unsubscribe).toHaveBeenCalled();
    expect(svc.enabled()).toBe(false);
    expect(svc.permissionDenied()).toBe(false);
  });

  it('enable con fallo al obtener la clave VAPID no marca permissionDenied', async () => {
    notificationsMock.getVapidPublicKey = vi.fn().mockReturnValue(throwError(() => new Error('500')));
    const svc = build();
    await svc.enable();
    expect(svc.enabled()).toBe(false);
    expect(svc.permissionDenied()).toBe(false);
    expect(swPushMock.requestSubscription).not.toHaveBeenCalled();
  });

  it('disable desuscribe y borra en el backend', async () => {
    const svc = build();
    svc.init();
    swPushMock.subscription.next(fakeBrowserSub);
    await svc.disable();
    expect(notificationsMock.unregisterSubscription).toHaveBeenCalledWith('https://push.example/e1');
    expect(svc.enabled()).toBe(false);
  });
});
