import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TenantService } from './core/tenant/tenant.service';
import { UpdateService } from './core/pwa/update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ButtonModule],
  template: `
    <router-outlet />

    <!-- Toast global de la PWA (nueva versión). Usa el MessageService raíz;
         los toasts de página tienen su propio provider y no pasan por acá. -->
    <p-toast key="pwa" position="bottom-center">
      <ng-template let-message pTemplate="message">
        <div class="ui-pwa-toast">
          <div class="ui-pwa-toast__text">
            <strong>{{ message.summary }}</strong>
            <span>{{ message.detail }}</span>
          </div>
          <p-button
            label="Actualizar"
            size="small"
            (onClick)="update.applyUpdate()"
          />
        </div>
      </ng-template>
    </p-toast>
  `,
  styles: `
    .ui-pwa-toast {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      width: 100%;
    }
    .ui-pwa-toast__text {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
      flex: 1;
    }
  `,
})
export class App {
  readonly tenant = inject(TenantService);
  protected readonly update = inject(UpdateService);

  constructor() {
    this.update.init();
  }
}
