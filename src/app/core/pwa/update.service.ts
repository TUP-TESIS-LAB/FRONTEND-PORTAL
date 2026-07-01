import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MessageService } from 'primeng/api';
import { filter } from 'rxjs';

/**
 * Aviso de nueva versión de la PWA. Cuando el service worker descarga una
 * versión nueva (VERSION_READY), muestra un toast sticky en el `p-toast`
 * global del app root (key "pwa") con la acción "Actualizar".
 *
 * En dev (`SwUpdate.isEnabled === false`, porque provideServiceWorker usa
 * `enabled: !isDevMode()`) no hace nada.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly messages = inject(MessageService);
  private started = false;

  /** Idempotente: el app root lo llama una sola vez al construirse. */
  init(): void {
    if (this.started || !this.swUpdate.isEnabled) {
      return;
    }
    this.started = true;

    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.messages.add({
          key: 'pwa',
          severity: 'info',
          sticky: true,
          summary: 'Nueva versión disponible',
          detail: 'Hay una actualización del portal. Tocá "Actualizar" para aplicarla.',
        });
      });
  }

  /** Activa la versión descargada y recarga para servirla. */
  async applyUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      this.reload();
    }
  }

  // Separado para poder spyearlo en tests (jsdom no permite mockear location)
  protected reload(): void {
    document.location.reload();
  }
}
