import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Suscripción Web Push del dispositivo. El display y el click de la notificación
 * los maneja el ngsw-worker (payload con formato { notification: ... } del backend):
 * acá solo vive el handshake permiso → suscripción → registro en el backend.
 *
 * En dev (`SwPush.isEnabled === false`, porque provideServiceWorker usa
 * `enabled: !isDevMode()`) queda todo deshabilitado — igual que UpdateService.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly api = inject(NotificationsService);

  private readonly _enabled = signal(false);
  private readonly _permissionDenied = signal(false);
  private currentEndpoint: string | null = null;
  private started = false;

  /** false en dev o en navegadores sin Push API. */
  readonly supported = signal(this.swPush.isEnabled);
  /** Hay una suscripción activa en este dispositivo. */
  readonly enabled = this._enabled.asReadonly();
  /** El usuario denegó el permiso del navegador (no insistir). */
  readonly permissionDenied = this._permissionDenied.asReadonly();

  /** Idempotente: el shell lo llama una vez; refleja la suscripción ya existente. */
  init(): void {
    if (this.started || !this.swPush.isEnabled) {
      return;
    }
    this.started = true;
    this.swPush.subscription.subscribe(sub => {
      this.currentEndpoint = sub?.endpoint ?? null;
      this._enabled.set(sub !== null);
    });
  }

  async enable(): Promise<void> {
    if (!this.swPush.isEnabled) {
      return;
    }

    let publicKey: string;
    try {
      publicKey = await firstValueFrom(this.api.getVapidPublicKey());
    } catch {
      // Fallo de red/backend al pedir la clave VAPID: no es un tema de permiso.
      this._enabled.set(false);
      return;
    }

    let sub: PushSubscription;
    try {
      sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
    } catch {
      // requestSubscription rechaza tanto por permiso denegado como por prompt cerrado.
      // jsdom no define `Notification`: sin esa API no podemos distinguir el motivo del
      // rechazo, así que se asume denegado (mismo resultado que el caso real de permiso denegado).
      this._permissionDenied.set(typeof Notification === 'undefined' || Notification.permission === 'denied');
      this._enabled.set(false);
      return;
    }

    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    try {
      await firstValueFrom(
        this.api.registerSubscription({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        }),
      );
    } catch {
      // El backend no conoce esta suscripción; desuscribir para no quedar desincronizados
      // (una suscripción viva solo en el navegador nunca recibiría notificaciones).
      try {
        await sub.unsubscribe();
      } catch {
        // rollback best-effort
      }
      this._enabled.set(false);
      return;
    }

    this.currentEndpoint = json.endpoint;
    this._enabled.set(true);
    this._permissionDenied.set(false);
  }

  async disable(): Promise<void> {
    const endpoint = this.currentEndpoint;
    try {
      await this.swPush.unsubscribe();
    } catch {
      // sin suscripción activa: nada que desuscribir
    }
    if (endpoint) {
      await firstValueFrom(this.api.unregisterSubscription(endpoint));
    }
    this.currentEndpoint = null;
    this._enabled.set(false);
  }
}
