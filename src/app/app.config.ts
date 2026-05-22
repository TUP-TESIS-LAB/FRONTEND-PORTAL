import {
  ApplicationConfig,
  APP_INITIALIZER,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { TenantService } from './core/tenant/tenant.service';
import { resolveTenantIdFromUrl } from './core/tenant/tenant-resolver';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),

    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
          cssLayer: {
            name: 'primeng',
            order: 'tailwind, primeng',
          },
        },
      },
    }),

    // Bloquea el bootstrap de Angular hasta que el tenant esté cargado.
    // Esto evita el flash de colores default antes de aplicar la paleta.
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const tenantSvc = inject(TenantService);
        return async () => {
          const id = resolveTenantIdFromUrl();
          await tenantSvc.loadTenant(id);
        };
      },
      multi: true,
    },

    // Restaura la sesión del usuario desde localStorage al arrancar la app.
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService],
      useFactory: (auth: AuthService) => () => { auth.loadFromStorage(); },
    },
  ],
};
