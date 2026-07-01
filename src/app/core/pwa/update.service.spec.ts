import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { MessageService } from 'primeng/api';
import { UpdateService } from './update.service';

describe('UpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let swUpdateMock: { isEnabled: boolean; versionUpdates: Subject<VersionEvent>; activateUpdate: ReturnType<typeof vi.fn> };
  let messagesMock: { add: ReturnType<typeof vi.fn> };

  function setup(enabled: boolean): UpdateService {
    versionUpdates = new Subject<VersionEvent>();
    swUpdateMock = {
      isEnabled: enabled,
      versionUpdates,
      activateUpdate: vi.fn().mockResolvedValue(true),
    };
    messagesMock = { add: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: MessageService, useValue: messagesMock },
      ],
    });
    return TestBed.inject(UpdateService);
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('con VERSION_READY muestra el toast sticky en español (key pwa, severidad info)', () => {
    const svc = setup(true);
    svc.init();
    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);

    expect(messagesMock.add).toHaveBeenCalledTimes(1);
    const msg = messagesMock.add.mock.calls[0][0];
    expect(msg.key).toBe('pwa');
    expect(msg.severity).toBe('info');
    expect(msg.sticky).toBe(true);
    expect(msg.summary).toBe('Nueva versión disponible');
    expect(msg.detail).toContain('actualización del portal');
  });

  it('ignora los eventos que no son VERSION_READY', () => {
    const svc = setup(true);
    svc.init();
    versionUpdates.next({ type: 'VERSION_DETECTED' } as VersionEvent);
    versionUpdates.next({ type: 'VERSION_INSTALLATION_FAILED' } as VersionEvent);
    expect(messagesMock.add).not.toHaveBeenCalled();
  });

  it('con SW deshabilitado (dev) no se suscribe ni emite nada', () => {
    const svc = setup(false);
    svc.init();
    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);
    expect(messagesMock.add).not.toHaveBeenCalled();
  });

  it('init es idempotente (una sola suscripción aunque se llame dos veces)', () => {
    const svc = setup(true);
    svc.init();
    svc.init();
    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);
    expect(messagesMock.add).toHaveBeenCalledTimes(1);
  });

  it('applyUpdate activa la versión descargada y recarga', async () => {
    const svc = setup(true);
    const reloadSpy = vi
      .spyOn(svc as unknown as { reload(): void }, 'reload')
      .mockImplementation(() => {});

    await svc.applyUpdate();
    expect(swUpdateMock.activateUpdate).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
