import {
  ApplicationConfig,
  APP_INITIALIZER,
  inject,
  provideBrowserGlobalErrorListeners, isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { TenantService } from './core/tenant/tenant.service';
import { resolveTenantIdFromUrl } from './core/tenant/tenant-resolver';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import { metaReducers } from './store/logger.meta-reducer';
import { passwordRecoveryReducer } from './features/auth/password-recovery/store/password-recovery.reducer';
import { PasswordRecoveryEffects } from './features/auth/password-recovery/store/password-recovery.effects';
import { perfilReducer } from './features/main/perfil/store/perfil.reducer';
import { PerfilEffects } from './features/main/perfil/store/perfil.effects';
import { turnosReducer } from './features/main/turnos/store/turnos.reducer';
import { TurnosEffects } from './features/main/turnos/store/turnos.effects';
import { familyReducer } from './features/main/familia/store/family.reducer';
import { FamilyEffects } from './features/main/familia/store/family.effects';
import { FAMILY_KEY } from './features/main/familia/store/family.state';
import { firstLoginReducer } from './features/auth/first-login/store/first-login.reducer';
import { FirstLoginEffects } from './features/auth/first-login/store/first-login.effects';
import { FIRST_LOGIN_KEY } from './features/auth/first-login/store/first-login.state';
import { provideServiceWorker } from '@angular/service-worker';
import { estudiosReducer } from './features/main/estudios/store/estudios.reducer';
import { EstudiosEffects } from './features/main/estudios/store/estudios.effects';
import { ESTUDIOS_KEY } from './features/main/estudios/store/estudios.state';
import { NOTIFICATIONS_KEY } from './core/notifications/store/notifications.state';
import { notificationsReducer } from './core/notifications/store/notifications.reducer';
import { NotificationsEffects } from './core/notifications/store/notifications.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // MessageService raíz para el toast global de la PWA (key "pwa" en app
    // root). Las páginas siguen proveyendo el suyo propio — este no las pisa.
    MessageService,

    provideStore({ router: routerReducer, passwordRecovery: passwordRecoveryReducer, perfil: perfilReducer, turnos: turnosReducer, [FAMILY_KEY]: familyReducer, [FIRST_LOGIN_KEY]: firstLoginReducer, [ESTUDIOS_KEY]: estudiosReducer, [NOTIFICATIONS_KEY]: notificationsReducer }, { metaReducers }),
    provideEffects(PasswordRecoveryEffects, PerfilEffects, TurnosEffects, FamilyEffects, FirstLoginEffects, EstudiosEffects, NotificationsEffects),
    provideRouterStore(),

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
      translation: {
        // Datepicker (días, meses, botones, accept/clear) en español
        dayNames:        ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
        dayNamesShort:   ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
        dayNamesMin:     ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
        monthNames:      ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                          'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
        today:           'Hoy',
        clear:           'Limpiar',
        weekHeader:      'Sem',
        firstDayOfWeek:  1,
        // Otros mensajes genéricos
        accept:          'Aceptar',
        reject:          'Cancelar',
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
      useFactory: (auth: AuthService) => () => {
        auth.loadFromStorage();
        // Si quedó sesión sin user en memoria, lo trae de /me/profile antes de renderizar.
        return firstValueFrom(auth.hydrateUserIfNeeded());
      },
    }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
};
